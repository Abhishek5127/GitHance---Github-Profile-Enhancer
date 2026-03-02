import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const GITHUB_API = "https://api.github.com";
const GITHUB_ACCEPT = "application/vnd.github+json";
const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;
const FILE_PATH_PATTERN = /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._\-\/]+$/;
const MAX_FILE_COUNT = 12;
const MAX_FILE_BYTES = 1_500_000;
const PROFILE_ONLY =
  String(process.env.PUBLISH_README_PROFILE_ONLY || "").toLowerCase() === "true";

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeOwner(value) {
  return normalizeId(value).toLowerCase();
}

function normalizePath(value) {
  return String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");
}

function isValidPath(path) {
  return (
    Boolean(path) &&
    path !== "." &&
    !path.endsWith("/") &&
    FILE_PATH_PATTERN.test(path)
  );
}

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      success: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

async function parseGithubResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function getContentMeta({ owner, repo, path, token }) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(
      /%2F/g,
      "/"
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: GITHUB_ACCEPT,
      },
      cache: "no-store",
    }
  );

  if (response.status === 404) {
    return { ok: true, exists: false, sha: null };
  }

  const payload = await parseGithubResponse(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.message || "Failed to fetch file metadata",
    };
  }

  return {
    ok: true,
    exists: true,
    sha: String(payload?.sha || ""),
  };
}

async function upsertRepositoryFile({
  owner,
  repo,
  path,
  message,
  content,
  token,
}) {
  const meta = await getContentMeta({ owner, repo, path, token });
  if (!meta.ok) {
    return meta;
  }

  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(
      /%2F/g,
      "/"
    )}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: GITHUB_ACCEPT,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        ...(meta.exists && meta.sha ? { sha: meta.sha } : {}),
      }),
    }
  );

  const payload = await parseGithubResponse(response);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.message || `Failed to upsert ${path}`,
      details: payload,
    };
  }

  return {
    ok: true,
    status: response.status,
    operation: meta.exists ? "updated" : "created",
    path,
    commitSha: String(payload?.commit?.sha || ""),
    contentSha: String(payload?.content?.sha || ""),
  };
}

function hasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}

function normalizeWriteTargets(body) {
  const files = [];

  if (hasOwn(body, "readmeContent")) {
    if (typeof body.readmeContent !== "string") {
      return {
        ok: false,
        status: 400,
        error: "readmeContent must be a string",
      };
    }

    files.push({
      path: "README.md",
      content: body.readmeContent,
      message: normalizeId(body.readmeMessage) || "Update README via GitHance",
    });
  }

  if (hasOwn(body, "svgContent")) {
    if (typeof body.svgContent !== "string") {
      return {
        ok: false,
        status: 400,
        error: "svgContent must be a string",
      };
    }

    const legacySvgPath = normalizePath(body.svgPath || "assets/headers/header.svg");
    if (!isValidPath(legacySvgPath)) {
      return {
        ok: false,
        status: 400,
        error: "Invalid svgPath format",
      };
    }

    files.push({
      path: legacySvgPath,
      content: body.svgContent,
      message: normalizeId(body.svgMessage) || "Update SVG asset via GitHance",
    });
  }

  if (Array.isArray(body.files)) {
    for (const [index, entry] of body.files.entries()) {
      if (!entry || typeof entry !== "object") {
        return {
          ok: false,
          status: 400,
          error: `files[${index}] must be an object`,
        };
      }

      const filePath = normalizePath(entry.path);
      if (!isValidPath(filePath)) {
        return {
          ok: false,
          status: 400,
          error: `files[${index}].path is invalid`,
        };
      }

      if (typeof entry.content !== "string") {
        return {
          ok: false,
          status: 400,
          error: `files[${index}].content must be a string`,
        };
      }

      const resolvedMessage = normalizeId(entry.message) || "Update file via GitHance";
      files.push({
        path: filePath,
        content: entry.content,
        message: resolvedMessage,
      });
    }
  }

  if (!files.length) {
    return {
      ok: false,
      status: 400,
      error:
        "No files to publish. Provide readmeContent, svgContent, or files[] entries.",
    };
  }

  if (files.length > MAX_FILE_COUNT) {
    return {
      ok: false,
      status: 400,
      error: `Too many files in one publish request (max ${MAX_FILE_COUNT})`,
    };
  }

  const deduped = [];
  const seenPaths = new Set();

  files.forEach((entry) => {
    const normalizedFilePath = normalizePath(entry.path);
    if (seenPaths.has(normalizedFilePath)) return;
    seenPaths.add(normalizedFilePath);
    deduped.push({
      ...entry,
      path: normalizedFilePath,
    });
  });

  for (const entry of deduped) {
    const byteSize = Buffer.byteLength(entry.content, "utf8");
    if (byteSize > MAX_FILE_BYTES) {
      return {
        ok: false,
        status: 413,
        error: `File ${entry.path} is too large (${byteSize} bytes, max ${MAX_FILE_BYTES})`,
      };
    }
  }

  return {
    ok: true,
    files: deduped,
  };
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const accessToken = String(session?.accessToken || "").trim();
    if (!accessToken) {
      return jsonError(401, "Missing GitHub access token. Please sign in again.");
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonError(400, "Invalid request body");
    }

    const owner = normalizeId(body.owner);
    const repo = normalizeId(body.repo);

    if (!owner || !repo) {
      return jsonError(400, "Both owner and repo are required");
    }

    if (!ID_PATTERN.test(owner) || !ID_PATTERN.test(repo)) {
      return jsonError(400, "Invalid owner or repo format");
    }

    const writeTargets = normalizeWriteTargets(body);
    if (!writeTargets.ok) {
      return jsonError(writeTargets.status || 400, writeTargets.error);
    }

    const sessionOwnerCandidates = [
      normalizeOwner(session?.user?.name),
      normalizeOwner(session?.username),
    ].filter(Boolean);

    if (!sessionOwnerCandidates.length) {
      return jsonError(403, "Unable to verify repository owner from session");
    }

    if (!sessionOwnerCandidates.includes(normalizeOwner(owner))) {
      return jsonError(403, "Owner must match the authenticated GitHub user");
    }

    if (PROFILE_ONLY && normalizeOwner(repo) !== normalizeOwner(owner)) {
      return jsonError(403, "Only profile repositories are allowed");
    }

    const writeResults = [];

    for (const file of writeTargets.files) {
      const result = await upsertRepositoryFile({
        owner,
        repo,
        path: file.path,
        message: file.message,
        content: file.content,
        token: accessToken,
      });

      if (!result.ok) {
        return jsonError(
          result.status || 502,
          `Failed to publish ${file.path}`,
          result.error || result.details
        );
      }

      writeResults.push(result);
    }

    return NextResponse.json(
      {
        success: true,
        owner,
        repo,
        results: writeResults,
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(500, error?.message || "Failed to publish repository files");
  }
}
