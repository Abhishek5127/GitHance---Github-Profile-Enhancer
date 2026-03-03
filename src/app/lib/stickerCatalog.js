export const STICKER_DRAG_PREFIX = "sticker-template";
export const STICKER_SLOT_DROP_PREFIX = "sticker-slot";
export const STICKER_SURFACE_DROP_PREFIX = "sticker-surface";

export const STICKER_LIBRARY = [
  {
    id: "tortoise",
    title: "Tortoise",
    description: "Calm mascot sticker.",
    assetPath: "/assets/readme/tortoise.svg",
    sizeClass: "h-16 w-16",
    sizePx: 64,
  },

  {
    id: "kungfu-panda",
    title: "Kungfu Panda",
    description: "Playful panda sticker.",
    assetPath: "/assets/stickers/kungfuPanda.png",
    sizeClass: "h-16 w-16",
    sizePx: 64,
  },
  {
    id: "developer",
    title: "Developer",
    description: "Developer mascot sticker.",
    assetPath: "/assets/stickers/developer.png",
    sizeClass: "h-16 w-16",
    sizePx: 64,
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
  "commitStat",
  "commits",
  "contribution",
  "section",
]);

export function getStickerById(stickerId) {
  const normalized = String(stickerId || "").trim();
  return STICKER_BY_ID.get(normalized) || null;
}

export function getStickerBaseSizePx(stickerId) {
  const sticker = getStickerById(stickerId);
  const size = Number(sticker?.sizePx || 0);
  if (Number.isFinite(size) && size > 0) {
    return Math.floor(size);
  }
  return 56;
}

export function getMaxStickerBaseSizePx() {
  return STICKER_LIBRARY.reduce((largest, sticker) => {
    const size = Number(sticker?.sizePx || 0);
    if (!Number.isFinite(size) || size <= 0) return largest;
    return Math.max(largest, Math.floor(size));
  }, 56);
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

export function buildStickerSurfaceDropId(targetId) {
  return `${STICKER_SURFACE_DROP_PREFIX}:${String(targetId || "").trim()}`;
}

export function parseStickerSurfaceDropId(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(`${STICKER_SURFACE_DROP_PREFIX}:`)) return null;

  const targetId = raw.slice(STICKER_SURFACE_DROP_PREFIX.length + 1).trim();
  if (!targetId) return null;

  return { targetId };
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

function normalizeUnit(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

export function normalizeStickerLayers(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      const stickerId = String(entry?.stickerId || "").trim();
      const sticker = getStickerById(stickerId);
      if (!sticker) return null;

      const id =
        String(entry?.id || "").trim() ||
        `layer-${sticker.id}-${String(entry?.x ?? "0.5")}-${String(entry?.y ?? "0.5")}`;
      const sizePxRaw = Number(entry?.sizePx);
      const baseSize = getStickerBaseSizePx(sticker.id) * 2;
      const sizePx = Number.isFinite(sizePxRaw)
        ? Math.max(24, Math.min(260, Math.floor(sizePxRaw)))
        : baseSize;

      const rotationRaw = Number(entry?.rotation || 0);
      const rotation = Number.isFinite(rotationRaw)
        ? Math.max(-360, Math.min(360, rotationRaw))
        : 0;

      return {
        id,
        stickerId: sticker.id,
        x: normalizeUnit(entry?.x, 0.5),
        y: normalizeUnit(entry?.y, 0.5),
        sizePx,
        rotation,
      };
    })
    .filter(Boolean);
}
