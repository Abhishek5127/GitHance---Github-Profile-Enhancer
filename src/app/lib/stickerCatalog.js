export const STICKER_DRAG_PREFIX = "sticker-template";
export const STICKER_SLOT_DROP_PREFIX = "sticker-slot";

export const STICKER_LIBRARY = [
  {
    id: "tortoise",
    title: "Tortoise",
    description: "Calm mascot sticker.",
    assetPath: "/assets/readme/tortoise.svg",
    sizeClass: "h-16 w-16",
  },
  {
    id: "spark",
    title: "Spark",
    description: "Small bright accent.",
    assetPath: "/assets/stickers/spark.svg",
    sizeClass: "h-12 w-12",
  },
  {
    id: "rocket",
    title: "Rocket",
    description: "Launch style accent.",
    assetPath: "/assets/stickers/rocket.svg",
    sizeClass: "h-14 w-14",
  },
];

const STICKER_BY_ID = new Map(STICKER_LIBRARY.map((entry) => [entry.id, entry]));

export const STICKER_SLOT_PRESETS = [
  {
    id: "top-left",
    title: "Top Left",
    shortLabel: "TL",
    positionClass: "left-3 top-3",
  },
  {
    id: "top-right",
    title: "Top Right",
    shortLabel: "TR",
    positionClass: "right-3 top-3",
  },
  {
    id: "bottom-left",
    title: "Bottom Left",
    shortLabel: "BL",
    positionClass: "bottom-3 left-3",
  },
  {
    id: "bottom-right",
    title: "Bottom Right",
    shortLabel: "BR",
    positionClass: "bottom-3 right-3",
  },
];

const SLOT_BY_ID = new Map(STICKER_SLOT_PRESETS.map((entry) => [entry.id, entry]));

const STICKER_TARGET_TYPES = new Set([
  "header",
  "commitStat",
  "commits",
  "contribution",
  "section",
]);

export function getStickerById(stickerId) {
  const normalized = String(stickerId || "").trim();
  return STICKER_BY_ID.get(normalized) || null;
}

export function getStickerSlotById(slotId) {
  const normalized = String(slotId || "").trim();
  return SLOT_BY_ID.get(normalized) || null;
}

export function canItemAcceptStickers(itemType) {
  const normalized = String(itemType || "").trim();
  return STICKER_TARGET_TYPES.has(normalized);
}

export function buildStickerDragId(stickerId) {
  return `${STICKER_DRAG_PREFIX}:${String(stickerId || "").trim()}`;
}

export function parseStickerDragId(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(`${STICKER_DRAG_PREFIX}:`)) return null;
  const stickerId = raw.slice(STICKER_DRAG_PREFIX.length + 1).trim();
  if (!stickerId) return null;
  return { stickerId };
}

export function buildStickerDropId(targetId, slotId) {
  return `${STICKER_SLOT_DROP_PREFIX}:${String(targetId || "").trim()}:${String(slotId || "").trim()}`;
}

export function parseStickerDropId(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(`${STICKER_SLOT_DROP_PREFIX}:`)) return null;

  const parts = raw.split(":");
  if (parts.length < 3) return null;

  const slotId = String(parts[parts.length - 1] || "").trim();
  const targetId = String(parts.slice(1, parts.length - 1).join(":") || "").trim();
  if (!targetId || !slotId) return null;
  if (!getStickerSlotById(slotId)) return null;

  return {
    targetId,
    slotId,
  };
}

export function normalizeStickerAssignments(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};

  STICKER_SLOT_PRESETS.forEach((slot) => {
    const stickerId = String(value?.[slot.id] || "").trim();
    if (!stickerId) return;
    if (!getStickerById(stickerId)) return;
    normalized[slot.id] = stickerId;
  });

  return normalized;
}
