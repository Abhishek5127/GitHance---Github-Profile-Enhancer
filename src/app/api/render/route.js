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
import {
  appendStickerOverlayToSvg,
  buildSvgStickerOverlay,
} from "@/app/lib/renderers/stickerSvg";
import { normalizeStickerAssignments } from "@/app/lib/stickerCatalog";
import { NextResponse } from "next/server";

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

function parseStickerAssignments(searchParams) {
  const raw = searchParams.get("stickers");
  if (!raw) return {};

  const candidates = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore URI decoding errors and fall back to the raw value.
  }

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value);
      return normalizeStickerAssignments(parsed);
    } catch {
      // Try next candidate.
    }
  }

  return {};
}

function parseSvgDimension(svgMarkup, attribute) {
  const normalizedAttr = String(attribute || "").trim();
  if (!normalizedAttr) return 0;

  const directMatch = new RegExp(
    `<svg[^>]*\\b${normalizedAttr}="([0-9]+(?:\\.[0-9]+)?)`,
    "i"
  ).exec(svgMarkup);
  if (directMatch?.[1]) {
    const value = Number(directMatch[1]);
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }

  return 0;
}

function getSvgDimensions(svgMarkup, fallbackWidth = 0, fallbackHeight = 0) {
  const parsedWidth = parseSvgDimension(svgMarkup, "width");
  const parsedHeight = parseSvgDimension(svgMarkup, "height");

  const widthFromViewBox = (() => {
    const match = /<svg[^>]*\bviewBox="([^"]+)"/i.exec(svgMarkup);
    if (!match?.[1]) return 0;
    const parts = match[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length !== 4) return 0;
    const width = Number(parts[2]);
    return Number.isFinite(width) && width > 0 ? Math.floor(width) : 0;
  })();

  const heightFromViewBox = (() => {
    const match = /<svg[^>]*\bviewBox="([^"]+)"/i.exec(svgMarkup);
    if (!match?.[1]) return 0;
    const parts = match[1]
      .trim()
      .split(/\s+/)
      .map((value) => Number(value));
    if (parts.length !== 4) return 0;
    const height = Number(parts[3]);
    return Number.isFinite(height) && height > 0 ? Math.floor(height) : 0;
  })();

  return {
    width:
      parsedWidth ||
      widthFromViewBox ||
      (Number.isFinite(fallbackWidth) && fallbackWidth > 0 ? Math.floor(fallbackWidth) : 500),
    height:
      parsedHeight ||
      heightFromViewBox ||
      (Number.isFinite(fallbackHeight) && fallbackHeight > 0 ? Math.floor(fallbackHeight) : 180),
  };
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

  const stickers = parseStickerAssignments(searchParams);
  if (Object.keys(stickers).length) {
    const dimensions = getSvgDimensions(svg, width, height);
    const stickerSize = Math.max(
      28,
      Math.min(72, Math.floor(dimensions.height * 0.3))
    );
    const overlay = buildSvgStickerOverlay({
      stickers,
      width: dimensions.width,
      height: dimensions.height,
      stickerSize,
      margin: Math.max(8, Math.floor(stickerSize * 0.2)),
    });

    svg = appendStickerOverlayToSvg(svg, overlay);
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
