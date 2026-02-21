/**
 * @typedef {import("@/app/types/github-bio").GitHubProfile} GitHubProfile
 * @typedef {import("@/app/types/github-bio").GitHubRepo} GitHubRepo
 * @typedef {import("@/app/types/github-bio").BioPayload} BioPayload
 */

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_TEXT_LENGTH = 300;
const DEFAULT_REPO_LIMIT = 50;

const profileCache = new Map();
const repoCache = new Map();
const identityCache = new Map();

const STACK_HINTS = [
  { label: "TypeScript", pattern: /\btypescript\b|\.ts\b/i },
  { label: "JavaScript", pattern: /\bjavascript\b|\.js\b|node|next|react|vue|angular/i },
  { label: "React", pattern: /\breact\b|next\.?js|frontend|ui/i },
  { label: "Node.js", pattern: /\bnode\b|express|nestjs|api/i },
  { label: "Python", pattern: /\bpython\b|django|flask|fastapi/i },
  { label: "Go", pattern: /\bgo(lang)?\b/i },
  { label: "Java", pattern: /\bjava\b|spring/i },
  { label: "Docker", pattern: /\bdocker\b|container/i },
  { label: "PostgreSQL", pattern: /postgres|postgresql/i },
  { label: "MongoDB", pattern: /mongodb|mongo/i },
];

const DOMAIN_HINTS = [
  { label: "ai", pattern: /\b(ai|ml|llm|gpt|nlp|agent)\b/i },
  { label: "auth", pattern: /\b(auth|oauth|jwt|signin|login|security)\b/i },
  { label: "web", pattern: /\b(web|frontend|backend|full[- ]?stack|next|react|api)\b/i },
  { label: "tooling", pattern: /\b(tool|cli|automation|workflow|plugin|sdk)\b/i },
  { label: "data", pattern: /\b(data|analytics|etl|pipeline|dashboard)\b/i },
  { label: "mobile", pattern: /\b(android|ios|react native|flutter|mobile)\b/i },
  { label: "devops", pattern: /\b(docker|k8s|kubernetes|terraform|aws|gcp|azure|deploy)\b/i },
];

function trimText(value, maxLength = MAX_TEXT_LENGTH) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.slice(0, maxLength);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
  const date = new Date(value || "");
  return Number.isNaN(date.getTime()) ? null : date;
}

function asIsoDate(value) {
  const date = toDate(value);
  return date ? date.toISOString() : "";
}

function makeCacheKey({ username, token }) {
  const scope = token ? "authed" : "public";
  return `${String(username || "").toLowerCase()}:${scope}`;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function readCache(cache, key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(cache, key, value) {
  cache.set(key, {
    value,
    cachedAt: Date.now(),
  });
}

function sortByUpdatedDesc(repos) {
  return [...repos].sort((a, b) => {
    const aTime = toDate(a.updated_at)?.getTime() || 0;
    const bTime = toDate(b.updated_at)?.getTime() || 0;
    return bTime - aTime;
  });
}

function normalizeTopics(topics) {
  if (!Array.isArray(topics)) return [];
  return topics
    .map((topic) => trimText(topic))
    .filter(Boolean)
    .slice(0, 20);
}

/**
 * @param {any} profile
 * @param {string} username
 * @returns {GitHubProfile}
 */
function normalizeProfile(profile, username) {
  return {
    username: trimText(profile?.login || username),
    name: trimText(profile?.name) || "",
    bio: trimText(profile?.bio) || "",
    location: trimText(profile?.location) || "",
    followers: toNumber(profile?.followers, 0),
    public_repos: toNumber(profile?.public_repos, 0),
  };
}

/**
 * @param {any} repo
 * @returns {GitHubRepo}
 */
function normalizeRepo(repo) {
  return {
    name: trimText(repo?.name),
    description: trimText(repo?.description) || "",
    language: trimText(repo?.language) || "",
    topics: normalizeTopics(repo?.topics),
    homepage: trimText(repo?.homepage) || "",
    stargazers_count: toNumber(repo?.stargazers_count, 0),
    forks_count: toNumber(repo?.forks_count, 0),
    size: toNumber(repo?.size, 0),
    created_at: asIsoDate(repo?.created_at),
    updated_at: asIsoDate(repo?.updated_at),
  };
}

function extractTopLanguages(repos, limit = 5) {
  const counts = new Map();

  repos.forEach((repo) => {
    const language = trimText(repo.language);
    if (!language) return;
    counts.set(language, (counts.get(language) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([language]) => language);
}

function inferPrimaryStack(repos, topLanguages) {
  const discovered = [];
  const seen = new Set();

  topLanguages.forEach((language) => {
    const normalized = trimText(language);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    discovered.push(normalized);
  });

  const corpus = repos
    .map((repo) =>
      [repo.name, repo.description, ...(repo.topics || [])]
        .filter(Boolean)
        .join(" ")
    )
    .join(" ");

  STACK_HINTS.forEach(({ label, pattern }) => {
    if (discovered.length >= 8) return;
    if (pattern.test(corpus) && !seen.has(label)) {
      seen.add(label);
      discovered.push(label);
    }
  });

  return discovered.slice(0, 8);
}

function inferDomains(repos) {
  const found = [];
  const seen = new Set();

  repos.forEach((repo) => {
    if (!trimText(repo.description)) return;
    const text = [repo.name, repo.description, ...(repo.topics || [])]
      .filter(Boolean)
      .join(" ");

    DOMAIN_HINTS.forEach(({ label, pattern }) => {
      if (seen.has(label)) return;
      if (pattern.test(text)) {
        seen.add(label);
        found.push(label);
      }
    });
  });

  return found.slice(0, 8);
}

function getDeployedProjects(repos) {
  return repos
    .filter((repo) => trimText(repo.homepage))
    .map((repo) => repo.name)
    .filter(Boolean)
    .slice(0, 10);
}

function getRecentActivity(repos) {
  const sorted = sortByUpdatedDesc(repos);
  return sorted[0]?.updated_at || "";
}

/**
 * @param {{ username: string; forceRefresh?: boolean }} params
 * @returns {Promise<any>}
 */
export async function fetchGithubProfile({ username, forceRefresh = false }) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new Error("GitHub username is required");
  }

  const cacheKey = makeCacheKey({ username: normalizedUsername, token: null });
  const cached = !forceRefresh ? readCache(profileCache, cacheKey) : null;
  if (cached) return cached;

  const response = await fetch("/api/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: normalizedUsername }),
  });

  const data = await response.json();
  if (!response.ok || !data?.profile) {
    throw new Error(data?.error || "Failed to fetch GitHub profile");
  }

  writeCache(profileCache, cacheKey, data.profile);
  return data.profile;
}

async function fetchAuthenticatedGithubIdentity({ token, forceRefresh = false }) {
  const tokenKey = String(token || "").trim();
  if (!tokenKey) {
    throw new Error("Missing GitHub access token");
  }

  const cacheKey = `token:${tokenKey}`;
  const cached = !forceRefresh ? readCache(identityCache, cacheKey) : null;
  if (cached) return cached;

  const response = await fetch("/api/github/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });

  const data = await response.json();
  if (!response.ok || !data?.username) {
    throw new Error(data?.error || "Failed to resolve authenticated GitHub user");
  }

  const identity = {
    username: normalizeUsername(data.username),
    profile: data.profile || null,
  };

  writeCache(identityCache, cacheKey, identity);
  return identity;
}

/**
 * @param {{ username: string; token?: string; repoLimit?: number; forceRefresh?: boolean }} params
 * @returns {Promise<any[]>}
 */
export async function fetchGithubRepos({
  username,
  token,
  repoLimit = DEFAULT_REPO_LIMIT,
  forceRefresh = false,
}) {
  const normalizedUsername = normalizeUsername(username);
  if (!normalizedUsername) {
    throw new Error("GitHub username is required");
  }

  const safeLimit = Math.min(DEFAULT_REPO_LIMIT, Math.max(1, toNumber(repoLimit, DEFAULT_REPO_LIMIT)));
  const fetchPerPage = Math.min(100, Math.max(safeLimit, safeLimit * 2));
  const cacheKey = `${makeCacheKey({ username: normalizedUsername, token })}:${safeLimit}`;
  const cached = !forceRefresh ? readCache(repoCache, cacheKey) : null;
  if (cached) return cached;

  const response = await fetch("/api/repositories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: normalizedUsername,
      token,
      page: 1,
      perPage: fetchPerPage,
      includeReadme: false,
    }),
  });

  const data = await response.json();
  if (!response.ok || !Array.isArray(data?.repos)) {
    throw new Error(data?.error || "Failed to fetch repositories");
  }

  const repos = sortByUpdatedDesc(data.repos)
    .filter((repo) => !repo?.fork)
    .slice(0, safeLimit);

  writeCache(repoCache, cacheKey, repos);
  return repos;
}

/**
 * @param {{ username: string; token?: string; repoLimit?: number; forceRefresh?: boolean }} params
 * @returns {Promise<BioPayload>}
 */
export async function buildBioPayload({
  username,
  token,
  repoLimit = DEFAULT_REPO_LIMIT,
  forceRefresh = false,
}) {
  let resolvedUsername = normalizeUsername(username);
  let profileFromIdentity = null;

  if (!resolvedUsername) {
    const identity = await fetchAuthenticatedGithubIdentity({ token, forceRefresh });
    resolvedUsername = identity.username;
    profileFromIdentity = identity.profile;
  }

  if (!resolvedUsername) {
    throw new Error("Unable to resolve GitHub username");
  }

  const [profileRaw, reposRaw] = await Promise.all([
    profileFromIdentity
      ? Promise.resolve(profileFromIdentity)
      : fetchGithubProfile({ username: resolvedUsername, forceRefresh }),
    fetchGithubRepos({ username: resolvedUsername, token, repoLimit, forceRefresh }),
  ]);

  const profile = normalizeProfile(profileRaw, resolvedUsername);
  const repos = reposRaw.map((repo) => normalizeRepo(repo));

  const topLanguages = extractTopLanguages(repos);
  const primaryStack = inferPrimaryStack(repos, topLanguages);
  const domains = inferDomains(repos);
  const deployedProjects = getDeployedProjects(repos);
  const recentActivity = getRecentActivity(repos);

  return {
    profile,
    repos,
    stats: {
      top_languages: topLanguages,
      primary_stack: primaryStack,
      domains,
      deployed_projects: deployedProjects,
      recent_activity: recentActivity,
    },
  };
}

/**
 * @param {BioPayload} payload
 */
export async function generateBioFromPayload(payload) {
  const response = await fetch("/api/ai/github-bio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok || typeof data?.bio !== "string") {
    throw new Error(data?.error || "Failed to generate bio");
  }

  return data;
}
