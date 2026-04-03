import {
  generateHeaderSvg,
  generateBioSvg,
  generateStackSvg,
  generateDecorativeSvg,
  generateTrophySvg,
} from "@/app/lib/generateBlockSvg";
import { bootstrapGithubStatsFromEvents, getGithubStatsForUser } from "@/app/lib/githubStats";
import renderContributionSvg from "@/app/lib/renderers/contributionSvg";
import renderStreakSvg from "@/app/lib/renderers/streakSvg";
import renderRepoSvg from "@/app/lib/renderers/repoSvg";
import { renderContributionHeatmapSvg } from "@/app/lib/renderers/contributionHeatmapSvg";
import {
  appendStickerOverlayToSvg,
  buildSvgStickerOverlay,
} from "@/app/lib/renderers/stickerSvg";
import {
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerAssignments,
  normalizeStickerLayers,
} from "@/app/lib/stickerCatalog";
import { NextResponse } from "next/server";
import { fetchGithubContributionCalendar, fetchGithubRecentEvents } from "@/app/lib/githubPublicData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function parseStickerLayers(searchParams) {
  const raw = searchParams.get("layers");
  if (!raw) return [];

  const candidates = [raw];
  try {
    const decoded = decodeURIComponent(raw);
    if (decoded && decoded !== raw) {
      candidates.push(decoded);
    }
  } catch {
    // Ignore URI decoding errors.
  }

  for (const value of candidates) {
    try {
      return normalizeStickerLayers(JSON.parse(value));
    } catch {
      // Try next candidate.
    }
  }

  return [];
}

function resolveAppOrigin(request) {
  const envUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  if (envUrl) {
    if (/^https?:\/\/githance\.vercel\.app$/i.test(envUrl)) {
      return "https://githance.in";
    }

    return envUrl;
  }

  const requestOrigin = new URL(request.url).origin.replace(/\/$/, "");
  if (/^https?:\/\/githance\.vercel\.app$/i.test(requestOrigin)) {
    return "https://githance.in";
  }

  return requestOrigin;
}

function buildStickerHrefMap(origin, stickers = {}, layers = []) {
  const stickerIds = new Set([
    ...Object.values(stickers || {}),
    ...(Array.isArray(layers) ? layers.map((layer) => layer?.stickerId) : []),
  ].filter(Boolean));

  const hrefEntries = [];
  stickerIds.forEach((stickerId) => {
    const sticker = getStickerById(stickerId);
    const assetPath = String(sticker?.assetPath || "").trim();
    if (!assetPath) return;

    try {
      hrefEntries.push([stickerId, new URL(assetPath, origin).toString()]);
    } catch {
      // Ignore invalid asset URLs.
    }
  });

  return Object.fromEntries(hrefEntries);
}

async function fetchContributionHeatmapData(username) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername) {
    return { username: "", totalContributions: 0, days: [] };
  }

  const accessToken = String(
    process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GH_TOKEN || ""
  ).trim();
  const result = await fetchGithubContributionCalendar({
    username: normalizedUsername,
    token: accessToken,
  });

  if (!result?.ok || !result?.data) {
    return { username: normalizedUsername, totalContributions: 0, days: [] };
  }

  return {
    username: String(result.data?.username || normalizedUsername).trim().toLowerCase(),
    totalContributions: Number(result.data?.totalContributions || 0),
    days: Array.isArray(result.data?.days) ? result.data.days : [],
  };
}

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

function statsUpdatedEpoch(stats) {
  const parsed = Date.parse(String(stats?.last_updated || ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSnapshotStats(snapshotStats, username, installationId) {
  if (!snapshotStats) return null;

  return {
    ...snapshotStats,
    github_username:
      String(snapshotStats.github_username || "").trim() || String(username || "").trim(),
    installation_id:
      Number(snapshotStats.installation_id || 0) || Number(installationId || 0) || null,
  };
}

function shouldPreferSnapshotStats(snapshotStats, currentStats) {
  if (!hasMeaningfulStats(snapshotStats)) return false;
  if (!hasMeaningfulStats(currentStats)) return true;

  const snapshotUpdatedEpoch = statsUpdatedEpoch(snapshotStats);
  const currentUpdatedEpoch = statsUpdatedEpoch(currentStats);

  if (snapshotUpdatedEpoch && snapshotUpdatedEpoch > currentUpdatedEpoch) {
    return true;
  }

  return (
    Number(snapshotStats.total_commits || 0) > Number(currentStats.total_commits || 0) ||
    Number(snapshotStats.recent_commits_30 || 0) > Number(currentStats.recent_commits_30 || 0) ||
    Number(snapshotStats.active_days_30 || 0) > Number(currentStats.active_days_30 || 0)
  );
}

async function fetchStatsFallback(username, installationId) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername) return null;

  const events = await fetchGithubRecentEvents({
    username: normalizedUsername,
    maxPages: 3,
    perPage: 100,
  });
  if (!events.length) return null;

  const result = await bootstrapGithubStatsFromEvents({
    username: normalizedUsername,
    installationId,
    events,
    force: true,
  });

  if (!result?.ok || !result?.stats) {
    return null;
  }

  return result.stats;
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
  const appOrigin = resolveAppOrigin(request);

  let svg = "";

  if (type === "contribution-heatmap") {
    const username = searchParams.get("user") || searchParams.get("username") || "";
    const range = searchParams.get("range") || "yearly";
    const contributionStickers = parseStickerAssignments(searchParams);
    const contributionStickerLayers = parseStickerLayers(searchParams);
    const contributionData = await fetchContributionHeatmapData(username);
    const stickerHrefs = buildStickerHrefMap(
      appOrigin,
      contributionStickers,
      contributionStickerLayers
    );

    svg = renderContributionHeatmapSvg({
      username: contributionData.username || username,
      days: contributionData.days,
      variant,
      range,
      stickers: contributionStickers,
      stickerLayers: contributionStickerLayers,
      stickerHrefs,
      title: "Contribution Graph",
      width,
      height,
    });
  } else if (type === "contribution" || type === "streak" || type === "repo") {
    const username = searchParams.get("user") || searchParams.get("username") || "";
    const installationId =
      searchParams.get("installation_id") || searchParams.get("installationId") || "";
    const snapshotStats = parseStatsSnapshot(searchParams);
    const preferSnapshot = isTruthyParam(searchParams.get("prefer_snapshot"));

    let resolvedStats = null;
    const normalizedSnapshotStats = normalizeSnapshotStats(
      snapshotStats,
      username,
      installationId
    );

    if (preferSnapshot && normalizedSnapshotStats) {
      resolvedStats = normalizedSnapshotStats;
    } else {
      const stats = await getGithubStatsForUser({
        username,
        installationId,
      });

      if (hasMeaningfulStats(stats)) {
        resolvedStats =
          normalizedSnapshotStats &&
          shouldPreferSnapshotStats(normalizedSnapshotStats, stats)
            ? {
                ...stats,
                ...normalizedSnapshotStats,
              }
            : stats;
      } else if (normalizedSnapshotStats) {
        resolvedStats = {
          ...stats,
          ...normalizedSnapshotStats,
        };
      } else {
        resolvedStats = (await fetchStatsFallback(username, installationId)) || stats;
      }
    }

    if (!resolvedStats) {
      resolvedStats = normalizedSnapshotStats || {};
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
  } else if (type === "decor") {
    svg = generateDecorativeSvg({
      variant,
      primaryColor: searchParams.get("pc") || searchParams.get("primary") || "#53D0FF",
      secondaryColor: searchParams.get("sc") || searchParams.get("secondary") || "#FF7A1A",
      accentColor: searchParams.get("ac") || searchParams.get("accent") || "#D946EF",
      thickness: Number(searchParams.get("t") || searchParams.get("thickness") || 8),
      alignment: searchParams.get("align") || searchParams.get("alignment") || "center",
      lineWidth: Number(searchParams.get("span") || searchParams.get("lineWidth") || 98),
    });
  } else if (type === "trophy") {
    const title = searchParams.get("title") || "Highlights";
    const columns = Number(searchParams.get("columns") || 4);
    const achievements = searchParams.getAll("a");
    svg = generateTrophySvg({ title, achievements, columns, theme });
  } else {
    svg = generateHeaderSvg({ variant: "stacked", name: "GitHance", subtitle: "Dynamic header" });
  }

  const stickers = parseStickerAssignments(searchParams);
  if (type !== "contribution-heatmap" && Object.keys(stickers).length) {
    const dimensions = getSvgDimensions(svg, width, height);
    const stickerSizeById = {};
    Object.values(stickers).forEach((stickerId) => {
      if (!stickerId || stickerSizeById[stickerId]) return;
      stickerSizeById[stickerId] = getStickerBaseSizePx(stickerId) * 2;
    });

    const maxStickerSize = Math.max(
      48,
      ...Object.values(stickerSizeById).map((value) => Number(value) || 0)
    );
    const overlay = buildSvgStickerOverlay({
      stickers,
      width: dimensions.width,
      height: dimensions.height,
      stickerSize: maxStickerSize,
      stickerSizeById,
      margin: Math.max(8, Math.floor(maxStickerSize * 0.16)),
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


