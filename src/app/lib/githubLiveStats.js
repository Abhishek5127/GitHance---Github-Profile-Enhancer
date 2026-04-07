import {
  getGithubStatsForUser,
  mergeGithubStatsWithRecentEvents,
  primeGithubStatsLookupCache,
} from "@/app/lib/githubStats";
import {
  fetchGithubCommitContributionStats,
  fetchGithubRecentEvents,
} from "@/app/lib/githubPublicData";

const LIVE_GITHUB_STATS_CACHE_TTL_MS = 5 * 1000;

function normalizeInstallationId(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function buildLiveGithubStatsCacheKey({ username, installationId = null }) {
  return `${normalizeInstallationId(installationId) ?? "none"}:${String(username || "")
    .trim()
    .toLowerCase()}`;
}

function getLiveGithubStatsCache() {
  if (!globalThis.__githanceLiveGithubStatsCache) {
    globalThis.__githanceLiveGithubStatsCache = {
      values: new Map(),
      pending: new Map(),
    };
  }

  return globalThis.__githanceLiveGithubStatsCache;
}

function readLiveGithubStatsCache({
  username,
  installationId = null,
  maxAgeMs = LIVE_GITHUB_STATS_CACHE_TTL_MS,
}) {
  const cache = getLiveGithubStatsCache();
  const cacheKey = buildLiveGithubStatsCacheKey({ username, installationId });
  const entry = cache.values.get(cacheKey);

  if (!entry) return null;

  if (Date.now() - Number(entry.cachedAt || 0) > maxAgeMs) {
    cache.values.delete(cacheKey);
    return null;
  }

  return entry.stats;
}

function writeLiveGithubStatsCache({ username, installationId = null, stats }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername || !stats) return stats;

  const cache = getLiveGithubStatsCache();
  cache.values.set(buildLiveGithubStatsCacheKey({ username, installationId }), {
    cachedAt: Date.now(),
    stats,
  });

  return stats;
}

function getGithubStatsAccessToken() {
  return String(
    process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GH_TOKEN || ""
  ).trim();
}

function mergeCommitContributionStats(baseStats, contributionStats, username, installationId) {
  if (!contributionStats || typeof contributionStats !== "object") {
    return baseStats;
  }

  return {
    ...baseStats,
    github_username: String(baseStats?.github_username || username || "").trim().toLowerCase(),
    installation_id: normalizeInstallationId(baseStats?.installation_id) ?? installationId,
    total_commits: Number(contributionStats.total_commits || baseStats?.total_commits || 0),
    current_streak: Number(contributionStats.current_streak || 0),
    longest_streak: Number(contributionStats.longest_streak || 0),
    last_repo: String(contributionStats.last_repo || baseStats?.last_repo || ""),
    active_days_30: Number(contributionStats.active_days_30 || 0),
    active_days_90: Number(contributionStats.active_days_90 || 0),
    top_repo_recent: String(contributionStats.top_repo_recent || baseStats?.top_repo_recent || ""),
    recent_commits_7: Number(contributionStats.recent_commits_7 || 0),
    recent_commits_30: Number(contributionStats.recent_commits_30 || 0),
    last_updated: String(contributionStats.last_updated || baseStats?.last_updated || ""),
  };
}

export async function loadFreshGithubStats({ username, installationId = null, token = "" }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) return null;

  const accessToken = String(token || getGithubStatsAccessToken()).trim();
  const baseStats = await getGithubStatsForUser({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
    includeHistory: true,
  });

  const resolvedInstallationId =
    normalizeInstallationId(baseStats?.installation_id) ?? normalizedInstallationId;

  let mergedStats = null;
  let source = "cache";
  let recentEvents = [];

  try {
    const contributionResult = await fetchGithubCommitContributionStats({
      username: normalizedUsername,
      token: accessToken,
    });

    if (contributionResult?.ok && contributionResult?.data) {
      mergedStats = mergeCommitContributionStats(
        baseStats,
        contributionResult.data,
        normalizedUsername,
        resolvedInstallationId
      );
      source = "graphql_commit_contributions";
    }
  } catch {
    mergedStats = null;
  }

  if (!mergedStats) {
    try {
      recentEvents = await fetchGithubRecentEvents({
        username: normalizedUsername,
        token: accessToken,
        maxPages: 3,
        perPage: 100,
      });
    } catch {
      recentEvents = [];
    }

    mergedStats = mergeGithubStatsWithRecentEvents(baseStats, {
      username: normalizedUsername,
      installationId: resolvedInstallationId,
      events: recentEvents,
    });
    source = recentEvents.length ? "events" : "cache";
  }

  const primedStats =
    primeGithubStatsLookupCache(mergedStats, {
      username: normalizedUsername,
      installationId: resolvedInstallationId,
    }) || mergedStats;

  return {
    source,
    events: recentEvents,
    installationId:
      normalizeInstallationId(primedStats?.installation_id) ?? resolvedInstallationId,
    stats: writeLiveGithubStatsCache({
      username: normalizedUsername,
      installationId: resolvedInstallationId,
      stats: primedStats,
    }),
  };
}

export async function getFreshGithubStats({ username, installationId = null, token = "" }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) return null;

  const cachedStats = readLiveGithubStatsCache({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });
  if (cachedStats) {
    return {
      source: "memory_cache",
      events: [],
      installationId:
        normalizeInstallationId(cachedStats?.installation_id) ?? normalizedInstallationId,
      stats: cachedStats,
    };
  }

  const cache = getLiveGithubStatsCache();
  const cacheKey = buildLiveGithubStatsCacheKey({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });
  const pendingRequest = cache.pending.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = loadFreshGithubStats({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
    token,
  }).finally(() => {
    cache.pending.delete(cacheKey);
  });

  cache.pending.set(cacheKey, request);
  return request;
}
