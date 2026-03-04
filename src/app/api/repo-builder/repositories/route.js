import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const PER_PAGE = 100;
const MAX_PAGES = 6;

function toHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

function normalizeLicense(license) {
  if (!license || typeof license !== "object") return "";
  if (license.spdx_id && license.spdx_id !== "NOASSERTION") {
    return String(license.spdx_id || "").trim();
  }
  return String(license.name || "").trim();
}

function mapRepository(repo = {}) {
  return {
    id: Number(repo?.id || 0),
    owner: String(repo?.owner?.login || "").trim(),
    name: String(repo?.name || "").trim(),
    full_name: String(repo?.full_name || "").trim(),
    description: String(repo?.description || "").trim(),
    private: Boolean(repo?.private),
    visibility: String(repo?.visibility || (repo?.private ? "private" : "public")).trim(),
    html_url: String(repo?.html_url || "").trim(),
    homepage: String(repo?.homepage || "").trim(),
    language: String(repo?.language || "").trim(),
    topics: Array.isArray(repo?.topics) ? repo.topics.map((topic) => String(topic || "").trim()).filter(Boolean) : [],
    stargazers_count: Number(repo?.stargazers_count || 0),
    forks_count: Number(repo?.forks_count || 0),
    open_issues_count: Number(repo?.open_issues_count || 0),
    watchers_count: Number(repo?.watchers_count || 0),
    default_branch: String(repo?.default_branch || "").trim(),
    pushed_at: String(repo?.pushed_at || "").trim(),
    updated_at: String(repo?.updated_at || "").trim(),
    created_at: String(repo?.created_at || "").trim(),
    archived: Boolean(repo?.archived),
    disabled: Boolean(repo?.disabled),
    fork: Boolean(repo?.fork),
    has_pages: Boolean(repo?.has_pages),
    has_wiki: Boolean(repo?.has_wiki),
    license: normalizeLicense(repo?.license),
  };
}

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

async function fetchOwnedRepositories(token) {
  const repositories = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(
      `${GITHUB_API}/user/repos?type=owner&sort=updated&direction=desc&per_page=${PER_PAGE}&page=${page}`,
      {
        headers: toHeaders(token),
        cache: "no-store",
      }
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: payload?.message || "Failed to fetch repositories",
      };
    }

    const pageItems = Array.isArray(payload) ? payload : [];
    repositories.push(...pageItems);

    if (pageItems.length < PER_PAGE) {
      break;
    }
  }

  const deduped = [];
  const seen = new Set();

  repositories.forEach((repo) => {
    const repoId = Number(repo?.id || 0);
    if (!repoId || seen.has(repoId)) return;
    seen.add(repoId);
    deduped.push(repo);
  });

  return {
    ok: true,
    data: deduped,
  };
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const accessToken = String(session?.accessToken || "").trim();
    if (!accessToken) {
      return jsonError(401, "Missing GitHub access token. Please sign in again.");
    }

    const result = await fetchOwnedRepositories(accessToken);
    if (!result.ok) {
      return jsonError(result.status || 502, result.error || "Failed to load repositories");
    }

    const repositories = result.data
      .filter((repo) => !repo?.fork)
      .map((repo) => mapRepository(repo));

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        repositories,
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(500, error?.message || "Failed to fetch repositories");
  }
}

