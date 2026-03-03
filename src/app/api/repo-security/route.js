import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import { analyzeDeveloperSecurity } from "@/app/lib/security/analyzeDeveloperSecurity";
import { classifyRepository } from "@/app/lib/security/classifyRepository";
import {
  DEFAULT_FETCH_CONCURRENCY,
  DEFAULT_MAX_ANALYZED_FILES,
  DEFAULT_MAX_FILE_SIZE_BYTES,
  DEFAULT_MAX_FINDINGS_RETURNED,
  DEFAULT_MAX_REPO_TREE_ITEMS,
  detectLanguageFromPath,
  isLikelyTextContent,
} from "@/app/lib/security/config";
import { filterDeveloperFiles } from "@/app/lib/security/filterDeveloperFiles";

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function toRelativePath(pathValue) {
  return String(pathValue || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

async function runWithConcurrency(items, concurrency, worker) {
  let nextIndex = 0;
  const safeConcurrency = Math.max(1, Math.min(concurrency, items.length || 1));

  const workers = Array.from({ length: safeConcurrency }, async () => {
    while (true) {
      const current = nextIndex;
      nextIndex += 1;
      if (current >= items.length) break;
      await worker(items[current], current);
    }
  });

  await Promise.all(workers);
}

async function fetchRepoInfoAndTree({ username, reponame, headers, maxTreeItems }) {
  const repoRes = await fetch(`https://api.github.com/repos/${username}/${reponame}`, { headers });
  if (!repoRes.ok) {
    return { error: "Repository not found", status: repoRes.status };
  }

  const repoInfo = await repoRes.json();
  const branch = repoInfo.default_branch;
  if (!branch) {
    return { error: "Repository default branch is missing", status: 422 };
  }

  const treeRes = await fetch(
    `https://api.github.com/repos/${username}/${reponame}/git/trees/${branch}?recursive=1`,
    { headers }
  );

  if (!treeRes.ok) {
    return { error: "Failed to fetch repository tree", status: treeRes.status };
  }

  const treeData = await treeRes.json();
  if (!Array.isArray(treeData?.tree)) {
    return { error: "Invalid repository tree response", status: 502 };
  }

  if (treeData.tree.length > maxTreeItems) {
    return { error: "Repository too large to analyze", status: 413 };
  }

  const normalizedTree = treeData.tree.map((item) => ({
    path: item.path,
    type: item.type === "tree" ? "folder" : "file",
    size: Number(item?.size || 0),
    sha: item?.sha || null,
  }));

  return { repoInfo, branch, normalizedTree };
}

async function fetchFileContent({
  username,
  reponame,
  branch,
  headers,
  file,
  maxFileSizeBytes,
}) {
  const encodedPath = toRelativePath(file.path);
  const contentUrl = `https://api.github.com/repos/${username}/${reponame}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(contentUrl, { headers });

  if (!res.ok) return { status: "unavailable", path: file.path, language: file.language };

  const body = await res.json();
  if (!body || Array.isArray(body) || body.type !== "file") {
    return { status: "unsupported", path: file.path, language: file.language };
  }

  const size = Number(body?.size || file.size || 0);
  if (size > maxFileSizeBytes) {
    return { status: "too_large", path: file.path, language: file.language };
  }

  if (body.encoding !== "base64" || typeof body.content !== "string") {
    return { status: "unsupported", path: file.path, language: file.language };
  }

  const content = Buffer.from(body.content, "base64").toString("utf8");
  if (!isLikelyTextContent(content)) {
    return { status: "binary", path: file.path, language: file.language };
  }

  return {
    status: "ok",
    path: file.path,
    size,
    language: file.language,
    content,
  };
}

function initializeFetchSkippedSummary() {
  return {
    unavailable: 0,
    unsupported: 0,
    too_large: 0,
    binary: 0,
  };
}

export async function POST(req) {
  try {
    const { username, reponame, token } = await req.json();
    if (!username || !reponame) {
      return Response.json(
        { error: "Username and repository name are required" },
        { status: 400 }
      );
    }

    if (!token) {
      return Response.json({ error: "Auth token missing, login again" }, { status: 401 });
    }

    const maxRepoTreeItems = parsePositiveInt(
      process.env.DEV_SEC_MAX_TREE_ITEMS,
      DEFAULT_MAX_REPO_TREE_ITEMS
    );
    const maxAnalyzedFiles = parsePositiveInt(
      process.env.DEV_SEC_MAX_FILES,
      DEFAULT_MAX_ANALYZED_FILES
    );
    const maxFileSizeBytes = parsePositiveInt(
      process.env.DEV_SEC_MAX_FILE_BYTES,
      DEFAULT_MAX_FILE_SIZE_BYTES
    );
    const fetchConcurrency = parsePositiveInt(
      process.env.DEV_SEC_FETCH_CONCURRENCY,
      DEFAULT_FETCH_CONCURRENCY
    );
    const maxFindingsReturned = parsePositiveInt(
      process.env.DEV_SEC_MAX_FINDINGS,
      DEFAULT_MAX_FINDINGS_RETURNED
    );

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    };

    const repoData = await fetchRepoInfoAndTree({
      username,
      reponame,
      headers,
      maxTreeItems: maxRepoTreeItems,
    });
    if (repoData?.error) {
      return Response.json({ error: repoData.error }, { status: repoData.status || 500 });
    }

    const { branch, normalizedTree } = repoData;
    const classification = classifyRepository(normalizedTree);

    const filtered = filterDeveloperFiles(normalizedTree, {
      maxAnalyzedFiles,
      maxFileSizeBytes,
    });

    const developerFiles = filtered.developerFiles.map((file) => ({
      ...file,
      language: detectLanguageFromPath(file.path),
    }));

    const fetchSkipped = initializeFetchSkippedSummary();
    const sourceFiles = [];
    await runWithConcurrency(developerFiles, fetchConcurrency, async (file) => {
      const fetched = await fetchFileContent({
        username,
        reponame,
        branch,
        headers,
        file,
        maxFileSizeBytes,
      });

      if (fetched?.status === "ok") {
        sourceFiles.push(fetched);
        return;
      }

      if (fetched?.status && fetchSkipped[fetched.status] !== undefined) {
        fetchSkipped[fetched.status] += 1;
      }
    });

    const report = analyzeDeveloperSecurity({
      sourceFiles,
      classification,
      skipped: {
        ...filtered.skipped,
        ...fetchSkipped,
      },
      options: {
        maxFindingsReturned,
      },
    });

    const relevantFiles = getRelevantFiles(
      sourceFiles.map((file) => ({ path: file.path, type: "file" })),
      { maxFiles: 180 }
    );

    return Response.json({
      success: true,
      repo: reponame,
      branch,
      relevantFiles,
      analysisMeta: {
        totalTreeFiles: normalizedTree.length,
        totalDeveloperFiles: filtered.developerFileCount,
        fetchedDeveloperFiles: sourceFiles.length,
        truncated: filtered.truncated,
        maxAnalyzedFiles,
        maxFileSizeBytes,
        fetchConcurrency,
      },
      report,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
