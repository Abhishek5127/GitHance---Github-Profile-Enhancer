import { NextResponse } from "next/server";
import {
  getFreshGithubStats,
  loadFreshGithubStats,
} from "@/app/lib/githubLiveStats";
import { resolveGithubUsername } from "@/app/lib/githubPublicData";

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
    const freshSnapshot = force
      ? await loadFreshGithubStats({
          username: resolvedUsername,
          installationId: explicitInstallationId,
          token,
        })
      : await getFreshGithubStats({
          username: resolvedUsername,
          installationId: explicitInstallationId,
          token,
        });

    if (!hasMeaningfulStats(freshSnapshot?.stats)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Failed to fetch fresh GitHub stats",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      bootstrapped: false,
      source: String(freshSnapshot?.source || "unknown"),
      github_username: resolvedUsername,
      installation_id:
        normalizeInstallationId(freshSnapshot?.installationId) ?? explicitInstallationId,
      events_fetched: Array.isArray(freshSnapshot?.events) ? freshSnapshot.events.length : 0,
      stats: freshSnapshot.stats,
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
