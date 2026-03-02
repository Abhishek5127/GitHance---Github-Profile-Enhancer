import { getStickerById, normalizeStickerAssignments } from "@/app/lib/stickerCatalog";

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function resolveStickerHref(stickerId, hrefMap = {}) {
  const normalizedStickerId = String(stickerId || "").trim();
  if (!normalizedStickerId) return "";

  const overrideHref = String(hrefMap?.[normalizedStickerId] || "").trim();
  if (overrideHref) return overrideHref;

  const sticker = getStickerById(normalizedStickerId);
  return String(sticker?.assetPath || "").trim();
}

export function buildSvgStickerOverlay({
  stickers = {},
  width = 500,
  height = 180,
  stickerSize = 56,
  margin = 10,
  hrefMap = {},
} = {}) {
  const normalizedStickers = normalizeStickerAssignments(stickers);
  const stickerEntries = Object.entries(normalizedStickers);
  if (!stickerEntries.length) return "";

  const safeWidth = Math.max(64, Number(width) || 500);
  const safeHeight = Math.max(64, Number(height) || 180);
  const safeSize = Math.max(16, Number(stickerSize) || 56);
  const safeMargin = Math.max(0, Number(margin) || 10);

  const positions = {
    "top-left": {
      x: safeMargin,
      y: safeMargin,
    },
    "top-right": {
      x: Math.max(0, safeWidth - safeMargin - safeSize),
      y: safeMargin,
    },
    "bottom-left": {
      x: safeMargin,
      y: Math.max(0, safeHeight - safeMargin - safeSize),
    },
    "bottom-right": {
      x: Math.max(0, safeWidth - safeMargin - safeSize),
      y: Math.max(0, safeHeight - safeMargin - safeSize),
    },
  };

  const images = stickerEntries
    .map(([slotId, stickerId]) => {
      const href = resolveStickerHref(stickerId, hrefMap);
      if (!href) return "";

      const coords = positions[slotId];
      if (!coords) return "";

      return `<image href="${escapeXml(href)}" x="${coords.x}" y="${coords.y}" width="${safeSize}" height="${safeSize}" preserveAspectRatio="xMidYMid meet" />`;
    })
    .filter(Boolean)
    .join("");

  if (!images) return "";
  return `<g aria-label="stickers">${images}</g>`;
}

export function appendStickerOverlayToSvg(svgMarkup, overlayMarkup) {
  const svg = String(svgMarkup || "");
  const overlay = String(overlayMarkup || "").trim();
  if (!svg || !overlay) return svg;

  if (!svg.includes("</svg>")) {
    return `${svg}${overlay}`;
  }

  return svg.replace("</svg>", `${overlay}\n</svg>`);
}
