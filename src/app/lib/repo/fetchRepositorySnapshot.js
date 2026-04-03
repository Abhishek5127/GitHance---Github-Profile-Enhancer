const GITHUB_API = "https://api.github.com";
const GITHUB_ACCEPT = "application/vnd.github+json";

function createGitHubError(status, message) {
  const error = new Error(message || "GitHub request failed");
  error.status = status;
  return error;
}

function toRelativePath(pathValue) {
  return String(pathValue || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeBase64Content(content) {
  if (typeof content !== "string" || !content) return "";

  try {
    return Buffer.from(content, "base64").toString("utf8");
  } catch {
    return "";
  }
}

async function parseGitHubResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function toHeaders(token = "") {
  const headers = {
    Accept: GITHUB_ACCEPT,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

function normalizeLicense(license) {
  if (!license || typeof license !== "object") return null;
  return {
    key: String(license.key || "").trim(),
    name: String(license.name || "").trim(),
    spdxId: String(license.spdx_id || "").trim(),
  };
}

function sanitizeRepoInfo(repoInfo) {
  return {
    id: Number(repoInfo?.id || 0) || null,
    name: String(repoInfo?.name || "").trim(),
    fullName: String(repoInfo?.full_name || "").trim(),
    description: String(repoInfo?.description || "").trim(),
    htmlUrl: String(repoInfo?.html_url || "").trim(),
    defaultBranch: String(repoInfo?.default_branch || "").trim(),
    language: String(repoInfo?.language || "").trim(),
    visibility: String(repoInfo?.visibility || "").trim(),
    private: Boolean(repoInfo?.private),
    topics: Array.isArray(repoInfo?.topics)
      ? repoInfo.topics.map((topic) => String(topic || "").trim()).filter(Boolean)
      : [],
    stars: Number(repoInfo?.stargazers_count || 0),
    forks: Number(repoInfo?.forks_count || 0),
    openIssues: Number(repoInfo?.open_issues_count || 0),
    homepage: String(repoInfo?.homepage || "").trim(),
    license: normalizeLicense(repoInfo?.license),
  };
}

export function normalizeGitHubId(value) {
  return String(value || "").trim();
}

export async function fetchRepositorySnapshot({
  owner,
  repo,
  token,
  maxTreeItems = 5000,
}) {
  const headers = toHeaders(token);

  const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers,
    cache: "no-store",
  });
  const repoPayload = await parseGitHubResponse(repoResponse);

  if (!repoResponse.ok) {
    throw createGitHubError(
      repoResponse.status,
      repoPayload?.message || "Repository not found"
    );
  }

  const branch = String(repoPayload?.default_branch || "").trim();
  if (!branch) {
    throw createGitHubError(422, "Repository default branch is missing");
  }

  const treeResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    {
      headers,
      cache: "no-store",
    }
  );
  const treePayload = await parseGitHubResponse(treeResponse);

  if (!treeResponse.ok) {
    throw createGitHubError(
      treeResponse.status,
      treePayload?.message || "Failed to fetch repository tree"
    );
  }

  const rawTree = Array.isArray(treePayload?.tree) ? treePayload.tree : [];
  if (rawTree.length > maxTreeItems) {
    throw createGitHubError(413, "Repository too large to analyze");
  }

  const tree = rawTree.map((item) => ({
    path: String(item?.path || "").trim(),
    type: item?.type === "tree" ? "folder" : "file",
    size: Number(item?.size || 0),
    sha: String(item?.sha || "").trim() || null,
  }));

  return {
    repoInfo: sanitizeRepoInfo(repoPayload),
    branch,
    tree,
  };
}

export async function fetchRepositoryReadme({ owner, repo, token }) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, {
    headers: toHeaders(token),
    cache: "no-store",
  });

  if (response.status === 404) {
    return {
      exists: false,
      path: "README.md",
      name: "README.md",
      sha: "",
      size: 0,
      htmlUrl: "",
      content: "",
    };
  }

  const payload = await parseGitHubResponse(response);
  if (!response.ok) {
    throw createGitHubError(
      response.status,
      payload?.message || "Failed to fetch repository README"
    );
  }

  const content =
    payload?.encoding === "base64" ? decodeBase64Content(payload?.content) : "";

  return {
    exists: true,
    path: String(payload?.path || "README.md").trim(),
    name: String(payload?.name || "README.md").trim(),
    sha: String(payload?.sha || "").trim(),
    size: Number(payload?.size || Buffer.byteLength(content, "utf8") || 0),
    htmlUrl: String(payload?.html_url || "").trim(),
    content,
  };
}

export async function fetchRepositoryFileContext({
  owner,
  repo,
  path,
  ref,
  token,
  maxBytes = 140_000,
  maxChars = 7_000,
}) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${toRelativePath(path)}?ref=${encodeURIComponent(
      ref
    )}`,
    {
      headers: toHeaders(token),
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return null;
  }

  const payload = await parseGitHubResponse(response);
  if (!response.ok) {
    throw createGitHubError(
      response.status,
      payload?.message || `Failed to fetch ${path}`
    );
  }

  if (!payload || Array.isArray(payload) || payload.type !== "file") {
    return null;
  }

  const size = Number(payload?.size || 0);
  if (size > maxBytes) {
    return {
      path,
      size,
      truncated: true,
      content: `Skipped: file is too large (${size} bytes).`,
    };
  }

  if (payload?.encoding !== "base64") {
    return null;
  }

  const decoded = decodeBase64Content(payload?.content);
  const content =
    decoded.length > maxChars
      ? `${decoded.slice(0, maxChars)}\n\n...truncated by GitHance for prompt size...`
      : decoded;

  return {
    path,
    size,
    truncated: decoded.length > maxChars,
    content,
  };
}

