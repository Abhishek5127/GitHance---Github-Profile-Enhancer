export const GRAPHIC_COMPONENT_VARIANTS = [
  {
    id: "solid-line",
    title: "Solid Line",
    description: "A clean rounded divider in one color.",
  },
  {
    id: "gradient-line",
    title: "Gradient Line",
    description: "A soft two-tone divider for section breaks.",
  },
  {
    id: "rgb-line",
    title: "RGB Line",
    description: "A glowing multicolor bar with neon energy.",
  },
  {
    id: "dot-divider",
    title: "Dot Divider",
    description: "A centered chain of dots for lighter separation.",
  },
  {
    id: "diamond-divider",
    title: "Diamond Divider",
    description: "Thin lines with a bold center diamond accent.",
  },
  {
    id: "wave-divider",
    title: "Wave Divider",
    description: "A flowing signal-style separator with motion.",
  },
  {
    id: "segment-bar",
    title: "Segment Bar",
    description: "A modular bar made from alternating blocks.",
  },
  {
    id: "animated-lines",
    title: "Animated Lines",
    description: "Layered streaks that slide gently across the divider.",
  },
  {
    id: "pulse-line",
    title: "Pulse Line",
    description: "A glowing line with an animated traveling pulse.",
  },
  {
    id: "leaf-trail",
    title: "Leaf Trail",
    description: "A flowing vine divider with softly animated leaves.",
  },
  {
    id: "spark-line",
    title: "Spark Line",
    description: "Tiny particles shimmer and race along the line.",
  },
];

export const GRAPHIC_COMPONENT_ALIGNMENTS = ["left", "center", "right"];

const DEFAULT_VARIANT = "gradient-line";
const DEFAULT_ALIGNMENT = "center";
const DEFAULT_PRIMARY_COLOR = "#53D0FF";
const DEFAULT_SECONDARY_COLOR = "#FF7A1A";
const DEFAULT_ACCENT_COLOR = "#D946EF";
const DEFAULT_THICKNESS = 10;
const DEFAULT_LINE_WIDTH = 96;

const VARIANT_IDS = new Set(GRAPHIC_COMPONENT_VARIANTS.map((entry) => entry.id));
const ALIGNMENT_IDS = new Set(GRAPHIC_COMPONENT_ALIGNMENTS);

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));

export function normalizeGraphicColor(value, fallback = DEFAULT_PRIMARY_COLOR) {
  const raw = String(value || "")
    .trim()
    .replace(/^#/, "");

  if (/^[0-9a-f]{3}$/i.test(raw)) {
    const expanded = raw
      .split("")
      .map((char) => `${char}${char}`)
      .join("")
      .toUpperCase();
    return `#${expanded}`;
  }

  if (/^[0-9a-f]{6}$/i.test(raw)) {
    return `#${raw.toUpperCase()}`;
  }

  return normalizeGraphicColor(fallback, DEFAULT_PRIMARY_COLOR);
}

export function normalizeGraphicVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return VARIANT_IDS.has(normalized) ? normalized : DEFAULT_VARIANT;
}

export function normalizeGraphicAlignment(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return ALIGNMENT_IDS.has(normalized) ? normalized : DEFAULT_ALIGNMENT;
}

export function normalizeGraphicThickness(value) {
  return clamp(Math.round(Number(value) || DEFAULT_THICKNESS), 4, 18);
}

export function normalizeGraphicLineWidth(value) {
  return clamp(Math.round(Number(value) || DEFAULT_LINE_WIDTH), 50, 100);
}

export function getGraphicComponentVariantById(value) {
  const normalized = normalizeGraphicVariant(value);
  return (
    GRAPHIC_COMPONENT_VARIANTS.find((entry) => entry.id === normalized) ||
    GRAPHIC_COMPONENT_VARIANTS[0]
  );
}

export function normalizeGraphicComponentData(data = {}) {
  return {
    variant: normalizeGraphicVariant(data?.variant || data?.style),
    alignment: normalizeGraphicAlignment(data?.alignment || data?.align),
    primaryColor: normalizeGraphicColor(data?.primaryColor || data?.color),
    secondaryColor: normalizeGraphicColor(
      data?.secondaryColor,
      DEFAULT_SECONDARY_COLOR
    ),
    accentColor: normalizeGraphicColor(
      data?.accentColor,
      DEFAULT_ACCENT_COLOR
    ),
    thickness: normalizeGraphicThickness(data?.thickness || data?.size),
    lineWidth: normalizeGraphicLineWidth(
      data?.lineWidth ||
        data?.lineLength ||
        data?.length ||
        data?.widthPercent ||
        data?.span
    ),
  };
}

export function buildGraphicComponentPayload(data = {}) {
  return normalizeGraphicComponentData(data);
}
