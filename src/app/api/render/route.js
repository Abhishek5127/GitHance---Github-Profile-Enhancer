import {
  generateHeaderSvg,
  generateBioSvg,
  generateStackSvg,
  generateTrophySvg,
} from "@/app/lib/generateBlockSvg";
import { getGithubStatsForUser } from "@/app/lib/githubStats";
import renderContributionSvg from "@/app/lib/renderers/contributionSvg";
import renderStreakSvg from "@/app/lib/renderers/streakSvg";
import renderRepoSvg from "@/app/lib/renderers/repoSvg";
import { NextResponse } from "next/server";
import { log } from "console";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasMeaningfulStats(stats) {
  if (!stats) return false;

  return (
    Number(stats.total_commits || 0) > 0 ||
    Number(stats.recent_commits_30 || 0) > 0 ||
    Number(stats.active_days_30 || 0) > 0 ||
    Boolean(String(stats.last_repo || "").trim()) ||
    Boolean(String(stats.top_repo_recent || "").trim())
  );
}

function parseStatsSnapshot(searchParams) {
  const raw = searchParams.get("snapshot");
  if (!raw) return null;
  

  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object") return null;
    
    return {
      github_username: String(parsed.github_username || ""),
      total_commits: Number(parsed.total_commits || 0),
      current_streak: Number(parsed.current_streak || 0),
      longest_streak: Number(parsed.longest_streak || 0),
      last_repo: String(parsed.last_repo || ""),
      active_days_30: Number(parsed.active_days_30 || 0),
      active_days_90: Number(parsed.active_days_90 || 0),
      top_repo_recent: String(parsed.top_repo_recent || ""),
      recent_commits_7: Number(parsed.recent_commits_7 || 0),
      recent_commits_30: Number(parsed.recent_commits_30 || 0),
      last_updated: String(parsed.last_updated || ""),
      installation_id: Number(parsed.installation_id || 0) || null,
    };
  } catch {
    return null;
  }
}

function isTruthyParam(value) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") || "";
  const variant = searchParams.get("variant") || "";
  const theme = searchParams.get("theme") || "midnight";
  const width = Number(searchParams.get("w") || searchParams.get("width") || 0);
  const height = Number(searchParams.get("h") || searchParams.get("height") || 0);

  let svg = "";

  if (type === "contribution" || type === "streak" || type === "repo") {
    const username = searchParams.get("user") || searchParams.get("username") || "";
    const installationId =
      searchParams.get("installation_id") || searchParams.get("installationId") || "";
    const snapshotStats = parseStatsSnapshot(searchParams);
    const preferSnapshot = isTruthyParam(searchParams.get("prefer_snapshot"));

    let resolvedStats = null;

    if (preferSnapshot && snapshotStats) {
      resolvedStats = {
        ...snapshotStats,
        github_username:
          String(snapshotStats.github_username || "").trim() || String(username || "").trim(),
        installation_id:
          Number(snapshotStats.installation_id || 0) ||
          Number(installationId || 0) ||
          null,
      };
    } else {
      const stats = await getGithubStatsForUser({
        username,
        installationId,
      });

      resolvedStats = hasMeaningfulStats(stats)
        ? stats
        : snapshotStats
          ? {
              ...stats,
              ...snapshotStats,
            }
          : stats;
    }

    if (type === "contribution") {
      svg = renderContributionSvg(resolvedStats, {
        width,
        height,
      });
    } else if (type === "streak") {
      svg = renderStreakSvg(resolvedStats, {
        width,
        height,
      });
    } else {
      const metric = searchParams.get("metric") || "last_repo";
      const window = Number(searchParams.get("window") || 0);
      svg = renderRepoSvg(resolvedStats, {
        metric,
        window,
        width,
        height,
      });
    }
  } else if (type === "header") {
    const name = searchParams.get("name") || "Your Name";
    const subtitle = searchParams.get("subtitle") || "Building thoughtful software";
    const accents = searchParams.getAll("a");
    svg = generateHeaderSvg({ variant, name, subtitle, accents, theme });
  } else if (type === "bio") {
    const title = searchParams.get("title") || "Full Stack Developer";
    const summary = searchParams.get("summary") || "Building modern web apps.";
    const chips = searchParams.getAll("c");
    svg = generateBioSvg({ variant, title, summary, chips, theme });
  } else if (type === "stack") {
    const stack = searchParams.getAll("s");
    svg = generateStackSvg({ variant, stack, theme });
  } else if (type === "trophy") {
    const title = searchParams.get("title") || "Highlights";
    const columns = Number(searchParams.get("columns") || 4);
    const achievements = searchParams.getAll("a");
    svg = generateTrophySvg({ title, achievements, columns, theme });
  } else {
    svg = generateHeaderSvg({ variant: "stacked", name: "GitHance", subtitle: "Dynamic header" });
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
