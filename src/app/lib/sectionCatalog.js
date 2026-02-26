export const SECTION_SLOT_DROP_PREFIX = "section-slot";

export const README_SECTION_VARIANTS = [
  {
    id: "equal-2",
    title: "Equal Columns (2)",
    description: "Two equal slots rendered as a Markdown-friendly table row.",
    slotCount: 2,
    canvasColumns: 2,
    canvasSlotMinHeight: 220,
    markdownLayout: "table",
  },
  {
    id: "equal-3",
    title: "Equal Columns (3)",
    description: "Three equal slots rendered as a Markdown-friendly table row.",
    slotCount: 3,
    canvasColumns: 3,
    canvasSlotMinHeight: 200,
    markdownLayout: "table",
  },
  {
    id: "center-stack",
    title: "Centered Rows",
    description: "Stacked centered slots for hero blocks and primary stats.",
    slotCount: 2,
    canvasColumns: 1,
    canvasSlotMinHeight: 210,
    markdownLayout: "center-rows",
  },
];

export function getSectionVariantById(variantId) {
  const normalized = String(variantId || "").trim().toLowerCase();
  return (
    README_SECTION_VARIANTS.find((variant) => variant.id === normalized) ||
    README_SECTION_VARIANTS[0]
  );
}

export function buildSectionSlotDropId(sectionId, slotIndex) {
  return `${SECTION_SLOT_DROP_PREFIX}:${String(sectionId || "")}:${Number(slotIndex)}`;
}

export function parseSectionSlotDropId(value) {
  const raw = String(value || "").trim();
  if (!raw.startsWith(`${SECTION_SLOT_DROP_PREFIX}:`)) return null;

  const parts = raw.split(":");
  if (parts.length < 3) return null;

  const sectionId = parts.slice(1, parts.length - 1).join(":").trim();
  const slotIndex = Number(parts[parts.length - 1]);
  if (!sectionId || !Number.isInteger(slotIndex) || slotIndex < 0) return null;

  return {
    sectionId,
    slotIndex,
  };
}
