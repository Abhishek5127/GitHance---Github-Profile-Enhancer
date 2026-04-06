import {
  generateHeaderSvg,
  generateBioSvg,
  generateStackSvg,
  generateDecorativeSvg,
  generateTrophySvg,
} from "@/app/lib/generateBlockSvg";
import {
  getGithubStatsForUser,
  mergeGithubStatsWithRecentEvents,
  primeGithubStatsLookupCache,
} from "@/app/lib/githubStats";
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
import {
  fetchGithubContributionCalendar,
  fetchGithubRecentEvents,
} from "@/app/lib/githubPublicData";
import { getFooterBannerById } from "@/app/lib/footerBannerCatalog";
import { buildFooterBannerSvg } from "@/app/lib/renderers/footerBannerSvg";

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

function normalizeInstallationId(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
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

  return !currentUpdatedEpoch && snapshotUpdatedEpoch > 0;
}

const RENDER_STATS_SNAPSHOT_FAST_PATH_MAX_AGE_MS = 10 * 60 * 1000;
const RENDER_GITHUB_STATS_CACHE_TTL_MS = 15 * 1000;

function getRenderGithubStatsCache() {
  if (!globalThis.__githanceRenderGithubStatsCache) {
    globalThis.__githanceRenderGithubStatsCache = {
      values: new Map(),
      pending: new Map(),
    };
  }

  return globalThis.__githanceRenderGithubStatsCache;
}

function buildRenderGithubStatsCacheKey({ username, installationId = null }) {
  return `${normalizeInstallationId(installationId) ?? "none"}:${String(username || "")
    .trim()
    .toLowerCase()}`;
}

function readRenderGithubStatsCache({
  username,
  installationId = null,
  maxAgeMs = RENDER_GITHUB_STATS_CACHE_TTL_MS,
}) {
  const cache = getRenderGithubStatsCache();
  const cacheKey = buildRenderGithubStatsCacheKey({ username, installationId });
  const entry = cache.values.get(cacheKey);

  if (!entry) return null;

  if (Date.now() - Number(entry.cachedAt || 0) > maxAgeMs) {
    cache.values.delete(cacheKey);
    return null;
  }

  return entry.stats;
}

function writeRenderGithubStatsCache({ username, installationId = null, stats }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername || !stats) return stats;

  const cache = getRenderGithubStatsCache();
  cache.values.set(buildRenderGithubStatsCacheKey({ username, installationId }), {
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

async function loadLiveGithubStats({ username, installationId = null }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) return null;

  const baseStats = await getGithubStatsForUser({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
    includeHistory: true,
  });

  let recentEvents = [];
  try {
    recentEvents = await fetchGithubRecentEvents({
      username: normalizedUsername,
      token: getGithubStatsAccessToken(),
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

  return writeRenderGithubStatsCache({
    username: normalizedUsername,
    installationId: resolvedInstallationId,
    stats: primedStats,
  });
}

async function getLiveGithubStats({ username, installationId = null }) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) return null;

  const cachedStats = readRenderGithubStatsCache({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });
  if (cachedStats) {
    return cachedStats;
  }

  const cache = getRenderGithubStatsCache();
  const cacheKey = buildRenderGithubStatsCacheKey({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });
  const pendingRequest = cache.pending.get(cacheKey);

  if (pendingRequest) {
    return pendingRequest;
  }

  const request = loadLiveGithubStats({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  }).finally(() => {
    cache.pending.delete(cacheKey);
  });

  cache.pending.set(cacheKey, request);
  return request;
}

function isFreshStatsSnapshot(stats, maxAgeMs = RENDER_STATS_SNAPSHOT_FAST_PATH_MAX_AGE_MS) {
  if (!stats || typeof stats !== "object") return false;
  const updatedAt = statsUpdatedEpoch(stats);
  if (!updatedAt) return false;
  return Date.now() - updatedAt <= maxAgeMs;
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
    const forceSnapshot = isTruthyParam(searchParams.get("force_snapshot"));

    let resolvedStats = null;
    const normalizedSnapshotStats = normalizeSnapshotStats(
      snapshotStats,
      username,
      installationId
    );
    const canUseSnapshotFastPath =
      preferSnapshot &&
      normalizedSnapshotStats &&
      hasMeaningfulStats(normalizedSnapshotStats) &&
      (forceSnapshot || isFreshStatsSnapshot(normalizedSnapshotStats));

    if (canUseSnapshotFastPath) {
      resolvedStats = normalizedSnapshotStats;
    } else {
      const stats = await getLiveGithubStats({
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
        resolvedStats = stats;
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
  } else if (type === "footer") {
    const banner = getFooterBannerById(
      searchParams.get("banner_id") || searchParams.get("bannerId") || ""
    );
    const rawFooterImage =
      typeof banner?.image === "string"
        ? banner.image
        : String(banner?.image?.src || "");
    let footerImageHref = "";

    if (rawFooterImage) {
      try {
        const assetUrl = /^https?:\/\//i.test(rawFooterImage)
          ? rawFooterImage
          : new URL(rawFooterImage, appOrigin).toString();
        const assetResponse = await fetch(assetUrl, { cache: "force-cache" });

        if (assetResponse.ok) {
          const mimeType =
            String(assetResponse.headers.get("content-type") || banner?.mimeType || "image/jpeg")
              .trim() || "image/jpeg";
          const assetBuffer = Buffer.from(await assetResponse.arrayBuffer());
          footerImageHref = `data:${mimeType};base64,${assetBuffer.toString("base64")}`;
        }
      } catch {
        footerImageHref = "";
      }
    }

    svg = buildFooterBannerSvg({
      imageHref: footerImageHref,
      title: banner?.title || "Footer Banner",
      alt: banner?.alt || banner?.title || "Footer banner",
      width: width || undefined,
      height: height || undefined,
    });
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

  const cacheControl =
    type === "contribution" || type === "streak" || type === "repo"
      ? "public, max-age=0, s-maxage=15, stale-while-revalidate=45"
      : "no-store, max-age=0";

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": cacheControl,
    },
  });
}
