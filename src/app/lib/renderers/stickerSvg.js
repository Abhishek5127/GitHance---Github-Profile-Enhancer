import {
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerLayers,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

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
  stickerSizeById = {},
  margin = 10,
  hrefMap = {},
} = {}) {
  const normalizedStickers = normalizeStickerAssignments(stickers);
  const stickerEntries = Object.entries(normalizedStickers);
  if (!stickerEntries.length) return "";

  const safeWidth = Math.max(64, Number(width) || 500);
  const safeHeight = Math.max(64, Number(height) || 180);
  const defaultSize = Math.max(16, Number(stickerSize) || 56);
  const sizeById =
    stickerSizeById && typeof stickerSizeById === "object" ? stickerSizeById : {};
  const safeMargin = Math.max(0, Number(margin) || 10);

  const positions = {
    "top-left": {
      x: safeMargin,
      y: safeMargin,
    },
    "top-right": {
      x: safeMargin,
      y: safeMargin,
    },
    "bottom-left": {
      x: safeMargin,
      y: safeMargin,
    },
    "bottom-right": {
      x: safeMargin,
      y: safeMargin,
    },
  };

  const images = stickerEntries
    .map(([slotId, stickerId]) => {
      const href = resolveStickerHref(stickerId, hrefMap);
      if (!href) return "";

      const coords = positions[slotId];
      if (!coords) return "";
      const resolvedSize = Math.max(
        16,
        Number(sizeById?.[stickerId]) || getStickerBaseSizePx(stickerId) || defaultSize
      );

      const x =
        slotId === "top-right" || slotId === "bottom-right"
          ? Math.max(0, safeWidth - safeMargin - resolvedSize)
          : coords.x;
      const y =
        slotId === "bottom-left" || slotId === "bottom-right"
          ? Math.max(0, safeHeight - safeMargin - resolvedSize)
          : coords.y;

      return `<image href="${escapeXml(href)}" x="${x}" y="${y}" width="${resolvedSize}" height="${resolvedSize}" preserveAspectRatio="xMidYMid meet" />`;
    })
    .filter(Boolean)
    .join("");

  if (!images) return "";
  return `<g aria-label="stickers">${images}</g>`;
}

export function buildSvgStickerLayerOverlay({
  stickerLayers = [],
  width = 500,
  height = 180,
  hrefMap = {},
} = {}) {
  const normalizedLayers = normalizeStickerLayers(stickerLayers);
  if (!normalizedLayers.length) return "";

  const safeWidth = Math.max(64, Number(width) || 500);
  const safeHeight = Math.max(64, Number(height) || 180);

  const images = normalizedLayers
    .map((layer) => {
      const href = resolveStickerHref(layer.stickerId, hrefMap);
      if (!href) return "";

      const sizePx = Math.max(16, Number(layer.sizePx) || getStickerBaseSizePx(layer.stickerId));
      const centerX = Math.max(0, Math.min(1, Number(layer.x) || 0.5)) * safeWidth;
      const centerY = Math.max(0, Math.min(1, Number(layer.y) || 0.5)) * safeHeight;
      const x = centerX - sizePx / 2;
      const y = centerY - sizePx / 2;
      const rotation = Number(layer.rotation || 0);
      const rotationTransform = rotation
        ? ` transform="rotate(${rotation} ${centerX} ${centerY})"`
        : "";

      return `<image href="${escapeXml(href)}" x="${x}" y="${y}" width="${sizePx}" height="${sizePx}" preserveAspectRatio="xMidYMid meet"${rotationTransform} />`;
    })
    .filter(Boolean)
    .join("");

  if (!images) return "";
  return `<g aria-label="sticker-layers">${images}</g>`;
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
