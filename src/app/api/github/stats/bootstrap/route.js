import { NextResponse } from "next/server";
import {
  bootstrapGithubStatsFromEvents,
  getGithubStatsForUser,
  mergeGithubStatsWithRecentEvents,
  primeGithubStatsLookupCache,
} from "@/app/lib/githubStats";
import { createGithubAppJwt, isGithubAppConfigured } from "@/app/lib/githubAppAuth";
import {
  buildGithubRestHeaders,
  fetchGithubRecentEvents,
  resolveGithubUsername,
} from "@/app/lib/githubPublicData";

const GITHUB_API = "https://api.github.com";

function normalizeInstallationId(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function hasMeaningfulStats(stats) {
  if (!stats || typeof stats !== "object") return false;

  return (
    Number(stats.total_commits || 0) > 0 ||
    Number(stats.recent_commits_30 || 0) > 0 ||
    Number(stats.active_days_30 || 0) > 0 ||
    Boolean(String(stats.last_repo || "").trim()) ||
    Boolean(String(stats.top_repo_recent || "").trim())
  );
}

async function resolveInstallationId({ username, installationId }) {
  const explicitInstallationId = normalizeInstallationId(installationId);
  if (explicitInstallationId !== null) {
    return explicitInstallationId;
  }

  if (!username || !isGithubAppConfigured()) {
    return null;
  }

  try {
    const appJwt = createGithubAppJwt();
    const response = await fetch(`${GITHUB_API}/app/installations?per_page=100`, {
      headers: buildGithubRestHeaders(appJwt, {
        Authorization: `Bearer ${appJwt}`,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) return null;

    const installations = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.installations)
        ? payload.installations
        : [];

    const normalizedUsername = String(username || "").trim().toLowerCase();
    if (!normalizedUsername) return null;

    const match = installations.find((installation) => {
      const accountLogin = String(installation?.account?.login || "")
        .trim()
        .toLowerCase();
      return accountLogin === normalizedUsername;
    });

    return normalizeInstallationId(match?.id);
  } catch {
    return null;
  }
}

async function resolveFreshStatsSnapshot({ username, installationId = null, token = "" }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedInstallationId = normalizeInstallationId(installationId);

  const baseStats = await getGithubStatsForUser({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
    includeHistory: true,
  });

  let recentEvents = [];
  try {
    recentEvents = await fetchGithubRecentEvents({
      username: normalizedUsername,
      token,
      maxPages: 3,
      perPage: 100,
    });
  } catch {
    recentEvents = [];
  }

  const resolvedInstallationId =
    normalizeInstallationId(baseStats?.installation_id) ?? normalizedInstallationId;
  const mergedStats = mergeGithubStatsWithRecentEvents(baseStats, {
    username: normalizedUsername,
    installationId: resolvedInstallationId,
    events: recentEvents,
  });

  const primedStats =
    primeGithubStatsLookupCache(mergedStats, {
      username: normalizedUsername,
      installationId: resolvedInstallationId,
    }) || mergedStats;

  return {
    events: recentEvents,
    installationId: normalizeInstallationId(primedStats?.installation_id) ?? resolvedInstallationId,
    stats: primedStats,
  };
}

export async function POST(req) {
  try {
    const {
      username = "",
      token = "",
      installationId = null,
      force = false,
    } = await req.json();

    const resolvedUsername = await resolveGithubUsername({ username, token });

    if (!resolvedUsername) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to resolve GitHub username",
        },
        { status: 400 }
      );
    }

    const explicitInstallationId = normalizeInstallationId(installationId);
    const useForceRefresh = Boolean(force);

    if (!useForceRefresh) {
      const freshSnapshot = await resolveFreshStatsSnapshot({
        username: resolvedUsername,
        installationId: explicitInstallationId,
        token,
      });

      if (hasMeaningfulStats(freshSnapshot.stats)) {
        return NextResponse.json({
          ok: true,
          bootstrapped: false,
          source: freshSnapshot.events.length ? "cache+events" : "cache",
          github_username: resolvedUsername,
          installation_id: freshSnapshot.installationId,
          events_fetched: freshSnapshot.events.length,
          stats: freshSnapshot.stats,
        });
      }
    }

    const resolvedInstallationId = await resolveInstallationId({
      username: resolvedUsername,
      installationId: explicitInstallationId,
    });

    const events = await fetchGithubRecentEvents({
      username: resolvedUsername,
      token,
      maxPages: 3,
      perPage: 100,
    });

    const result = await bootstrapGithubStatsFromEvents({
      username: resolvedUsername,
      installationId: resolvedInstallationId,
      events,
      force: useForceRefresh || resolvedInstallationId === null,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: Number(result?.status) || 400 });
    }

    const primedStats =
      primeGithubStatsLookupCache(result.stats, {
        username: resolvedUsername,
        installationId: resolvedInstallationId,
      }) || result.stats;

    return NextResponse.json({
      ok: true,
      github_username: resolvedUsername,
      installation_id: resolvedInstallationId,
      events_fetched: events.length,
      ...result,
      stats: primedStats,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to bootstrap GitHub stats",
      },
      { status: 500 }
    );
  }
}
