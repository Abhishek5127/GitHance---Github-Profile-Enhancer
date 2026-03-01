import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const GITHUB_API = "https://api.github.com";
const GITHUB_ACCEPT = "application/vnd.github+json";
const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;
const PROFILE_ONLY =
  String(process.env.PUBLISH_README_PROFILE_ONLY || "").toLowerCase() === "true";

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeOwner(value) {
  return normalizeId(value).toLowerCase();
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
    const svgContent = typeof body.svgContent === "string" ? body.svgContent : "";
    const readmeContent =
      typeof body.readmeContent === "string" ? body.readmeContent : "";

    if (!owner || !repo) {
      return jsonError(400, "Both owner and repo are required");
    }

    if (!ID_PATTERN.test(owner) || !ID_PATTERN.test(repo)) {
      return jsonError(400, "Invalid owner or repo format");
    }

    if (!svgContent && !readmeContent) {
      return jsonError(400, "At least one of svgContent or readmeContent is required");
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

    if (svgContent) {
      const svgResult = await upsertRepositoryFile({
        owner,
        repo,
        path: "assets/headers/header.svg",
        message: "Add profile header SVG",
        content: svgContent,
        token: accessToken,
      });

      if (!svgResult.ok) {
        return jsonError(
          svgResult.status || 502,
          "Failed to publish header SVG",
          svgResult.error || svgResult.details
        );
      }

      writeResults.push(svgResult);
    }

    if (readmeContent) {
      const readmeResult = await upsertRepositoryFile({
        owner,
        repo,
        path: "README.md",
        message: "Update README via GitHance",
        content: readmeContent,
        token: accessToken,
      });

      if (!readmeResult.ok) {
        return jsonError(
          readmeResult.status || 502,
          "Failed to publish README",
          readmeResult.error || readmeResult.details
        );
      }

      writeResults.push(readmeResult);
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
