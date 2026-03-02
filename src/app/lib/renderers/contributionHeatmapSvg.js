const DAY_MS = 24 * 60 * 60 * 1000;
const YEARLY_WEEKS_TO_RENDER = 53;
const MONTHLY_WEEKS_TO_RENDER = 6;

export const CONTRIBUTION_GRAPH_VARIANTS = [
  {
    id: "classic",
    title: "Classic",
    description: "GitHub-style green heatmap with clean typography.",
  },
  {
    id: "neon",
    title: "Neon",
    description: "Cyan glow palette with a futuristic dashboard feel.",
  },
  {
    id: "sunset",
    title: "Sunset",
    description: "Warm red-orange palette with a premium card treatment.",
  },
];

const VARIANT_IDS = new Set(CONTRIBUTION_GRAPH_VARIANTS.map((entry) => entry.id));

export const CONTRIBUTION_GRAPH_RANGES = [
  {
    id: "yearly",
    title: "Yearly",
    description: "Last 12 months of contributions.",
  },
  {
    id: "monthly",
    title: "Monthly",
    description: "Focused last 30 days contribution view.",
  },
];

const RANGE_IDS = new Set(CONTRIBUTION_GRAPH_RANGES.map((entry) => entry.id));

const VARIANT_THEMES = {
  classic: {
    bg: "#0d1117",
    panel: "#010409",
    border: "#30363d",
    title: "#e6edf3",
    subtitle: "#8b949e",
    month: "#8b949e",
    legend: "#8b949e",
    dayLabel: "#8b949e",
    levels: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  neon: {
    bg: "#050b14",
    panel: "#081224",
    border: "#1e3952",
    title: "#e9fdff",
    subtitle: "#8ed8e2",
    month: "#8ed8e2",
    legend: "#8ed8e2",
    dayLabel: "#8ed8e2",
    levels: ["#101827", "#0b3c52", "#0b6f86", "#00b7d5", "#6ef6ff"],
  },
  sunset: {
    bg: "#140c14",
    panel: "#1b1120",
    border: "#473043",
    title: "#ffe9de",
    subtitle: "#d7a89d",
    month: "#d7a89d",
    legend: "#d7a89d",
    dayLabel: "#d7a89d",
    levels: ["#241326", "#4a1f3a", "#7b2e4d", "#c1535a", "#ff8b5b"],
  },
};

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return null;

  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()));
}

function toIsoDate(value) {
  const parsed = normalizeDate(value);
  if (!parsed) return "";
  return parsed.toISOString().slice(0, 10);
}

function startOfWeekUtc(date) {
  const copy = new Date(date.getTime());
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy;
}

function formatMonthLabel(isoDate) {
  const parsed = normalizeDate(isoDate);
  if (!parsed) return "";
  return parsed.toLocaleString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
}

function resolveTheme(variant) {
  return VARIANT_THEMES[variant] || VARIANT_THEMES.classic;
}

function quantile(sortedValues, percentile) {
  if (!sortedValues.length) return 0;
  const index = Math.floor((sortedValues.length - 1) * percentile);
  return Number(sortedValues[index] || 0);
}

function buildLevelResolver(counts = []) {
  const nonZero = counts
    .map((value) => Number(value || 0))
    .filter((value) => Number.isFinite(value) && value > 0)
    .sort((a, b) => a - b);

  if (!nonZero.length) {
    return () => 0;
  }

  const q1 = quantile(nonZero, 0.25);
  const q2 = quantile(nonZero, 0.5);
  const q3 = quantile(nonZero, 0.75);

  const threshold1 = Math.max(1, q1);
  const threshold2 = Math.max(threshold1 + 1, q2);
  const threshold3 = Math.max(threshold2 + 1, q3);

  return (count) => {
    const value = Number(count || 0);
    if (!Number.isFinite(value) || value <= 0) return 0;
    if (value < threshold1) return 1;
    if (value < threshold2) return 2;
    if (value < threshold3) return 3;
    return 4;
  };
}

export function normalizeContributionVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (VARIANT_IDS.has(normalized)) {
    return normalized;
  }
  return "classic";
}

export function normalizeContributionRange(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (RANGE_IDS.has(normalized)) {
    return normalized;
  }
  return "yearly";
}

function normalizeContributionDays(days = []) {
  const map = new Map();

  (Array.isArray(days) ? days : []).forEach((entry) => {
    const date = toIsoDate(entry?.date);
    if (!date) return;

    const count = Number(entry?.count || 0);
    if (!Number.isFinite(count) || count < 0) return;

    map.set(date, Math.floor(count));
  });

  return map;
}

export function renderContributionHeatmapSvg({
  username = "github-user",
  days = [],
  variant = "classic",
  range = "yearly",
  title = "Contribution Graph",
  width = 900,
  height = 240,
  compact = false,
} = {}) {
  const normalizedVariant = normalizeContributionVariant(variant);
  const normalizedRange = normalizeContributionRange(range);
  const theme = resolveTheme(normalizedVariant);
  const safeUsername = escapeXml(username || "github-user");
  const safeTitle = escapeXml(title || "Contribution Graph");
  const rangeLabel =
    normalizedRange === "monthly" ? "Last 30 Days" : "Last 12 Months";
  const weeksToRender =
    normalizedRange === "monthly"
      ? MONTHLY_WEEKS_TO_RENDER
      : YEARLY_WEEKS_TO_RENDER;

  const dayMap = normalizeContributionDays(days);
  const allCounts = [...dayMap.values()];
  const resolveLevel = buildLevelResolver(allCounts);

  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const rawStart = new Date(endDate.getTime() - (weeksToRender * 7 - 1) * DAY_MS);
  const startDate = startOfWeekUtc(rawStart);

  const outerPaddingX = compact ? 16 : 22;
  const outerPaddingY = compact ? 14 : 18;
  const cell = compact ? 9 : 10;
  const gap = compact ? 2 : 3;
  const weekWidth = cell + gap;
  const gridWidth = weeksToRender * weekWidth - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  const leftLabelSpace = compact ? 46 : 52;
  const minWidth = outerPaddingX + leftLabelSpace + gridWidth + outerPaddingX;
  const effectiveWidth = Math.max(width, minWidth);

  let gridX = Math.floor((effectiveWidth - gridWidth) / 2);
  gridX = Math.max(gridX, outerPaddingX + leftLabelSpace);

  const titleY = outerPaddingY + (compact ? 10 : 12);
  const subtitleY = titleY + (compact ? 14 : 18);
  const monthY = subtitleY + (compact ? 14 : 18);
  const gridY = monthY + (compact ? 10 : 12);
  const legendY = gridY + gridHeight + (compact ? 20 : 24);
  const minHeight = legendY + outerPaddingY + (compact ? 4 : 6);
  const effectiveHeight = Math.max(height, minHeight);
  const verticalShift = Math.floor((effectiveHeight - minHeight) / 2);
  const shiftedTitleY = titleY + verticalShift;
  const shiftedSubtitleY = subtitleY + verticalShift;
  const shiftedMonthY = monthY + verticalShift;
  const shiftedGridY = gridY + verticalShift;
  const shiftedLegendY = legendY + verticalShift;
  const dayLabelX = gridX - (compact ? 34 : 40);

  const cells = [];
  const monthLabels = [];
  let previousMonth = "";

  for (let week = 0; week < weeksToRender; week += 1) {
    const weekDate = new Date(startDate.getTime() + week * 7 * DAY_MS);
    const isoWeekDate = toIsoDate(weekDate);
    const month = isoWeekDate.slice(5, 7);

    if (!previousMonth || month !== previousMonth) {
      monthLabels.push({
        x: gridX + week * weekWidth,
        label: formatMonthLabel(isoWeekDate),
      });
      previousMonth = month;
    }

    for (let day = 0; day < 7; day += 1) {
      const date = new Date(weekDate.getTime() + day * DAY_MS);
      if (date > endDate) continue;

      const isoDate = toIsoDate(date);
      const count = Number(dayMap.get(isoDate) || 0);
      const level = resolveLevel(count);
      const fill = theme.levels[Math.max(0, Math.min(level, theme.levels.length - 1))];

      cells.push({
        x: gridX + week * weekWidth,
        y: shiftedGridY + day * (cell + gap),
        fill,
        date: isoDate,
        count,
      });
    }
  }

  const monthText = monthLabels
    .map(
      (entry) =>
        `<text x="${entry.x}" y="${shiftedMonthY}" fill="${theme.month}" font-size="${
          compact ? 9 : 10
        }" font-family="Inter, Segoe UI, sans-serif">${escapeXml(entry.label)}</text>`
    )
    .join("");

  const dayMarkers = [
    { label: "Mon", day: 1 },
    { label: "Wed", day: 3 },
    { label: "Fri", day: 5 },
  ]
    .map((entry) => {
      const y = shiftedGridY + entry.day * (cell + gap) + 8;
      return `<text x="${dayLabelX}" y="${y}" fill="${theme.dayLabel}" font-size="${
        compact ? 9 : 10
      }" font-family="Inter, Segoe UI, sans-serif">${entry.label}</text>`;
    })
    .join("");

  const cellsMarkup = cells
    .map(
      (cellEntry) => `<rect x="${cellEntry.x}" y="${cellEntry.y}" width="${cell}" height="${cell}" rx="2.4" fill="${cellEntry.fill}">
  <title>${cellEntry.date}: ${cellEntry.count} contribution${cellEntry.count === 1 ? "" : "s"}</title>
</rect>`
    )
    .join("");

  const legendStartX = gridX + gridWidth - 4 * (cell + gap) - 104;

  const legendCells = theme.levels
    .map(
      (fill, index) => `<rect x="${legendStartX + 64 + index * (cell + gap)}" y="${
        shiftedLegendY - cell + 1
      }" width="${cell}" height="${cell}" rx="2" fill="${fill}" />`
    )
    .join("");

  return `
<svg width="${effectiveWidth}" height="${effectiveHeight}" viewBox="0 0 ${effectiveWidth} ${effectiveHeight}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Contribution graph for ${safeUsername}">
  <defs>
    <linearGradient id="contrib-bg-${normalizedVariant}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${theme.bg}" />
      <stop offset="100%" stop-color="${theme.panel}" />
    </linearGradient>
  </defs>
  <rect width="${effectiveWidth}" height="${effectiveHeight}" rx="${compact ? 12 : 16}" fill="url(#contrib-bg-${normalizedVariant})" />
  <rect x="${compact ? 6 : 8}" y="${compact ? 6 : 8}" width="${
    effectiveWidth - (compact ? 12 : 16)
  }" height="${effectiveHeight - (compact ? 12 : 16)}" rx="${compact ? 10 : 12}" fill="none" stroke="${theme.border}" />

  <text x="${outerPaddingX}" y="${shiftedTitleY}" fill="${theme.title}" font-size="${
    compact ? 13 : 16
  }" font-family="Inter, Segoe UI, sans-serif" font-weight="700">${safeTitle}</text>
  <text x="${outerPaddingX}" y="${shiftedSubtitleY}" fill="${theme.subtitle}" font-size="${
    compact ? 10 : 12
  }" font-family="Inter, Segoe UI, sans-serif">@${safeUsername}</text>
  <text x="${effectiveWidth - outerPaddingX}" y="${shiftedSubtitleY}" fill="${
    theme.subtitle
  }" font-size="${compact ? 10 : 11}" text-anchor="end" font-family="Inter, Segoe UI, sans-serif">${escapeXml(
    rangeLabel
  )}</text>

  ${monthText}
  ${dayMarkers}
  ${cellsMarkup}

  <text x="${legendStartX}" y="${shiftedLegendY}" fill="${theme.legend}" font-size="${
    compact ? 9 : 10
  }" font-family="Inter, Segoe UI, sans-serif">Less</text>
  ${legendCells}
  <text x="${legendStartX + 64 + 5 * (cell + gap)}" y="${shiftedLegendY}" fill="${
    theme.legend
  }" font-size="${
    compact ? 9 : 10
  }" font-family="Inter, Segoe UI, sans-serif">More</text>
</svg>`.trim();
}
