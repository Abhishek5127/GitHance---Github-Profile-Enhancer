export const RENDER_THEMES = {
  midnight: {
    bg: "#0b0d0f",
    panel: "#14181f",
    accent: "#ff7a1a",
    text: "#f5f7fb",
    subtext: "#9aa4b2",
  },
  aurora: {
    bg: "#0b0d0f",
    panel: "#131a22",
    accent: "#53d0ff",
    text: "#f5f7fb",
    subtext: "#a9b7c6",
  },
  ember: {
    bg: "#0b0d0f",
    panel: "#1a1412",
    accent: "#ffb347",
    text: "#f5f7fb",
    subtext: "#cbb59b",
  },
};

const escapeXml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
const RENDER_VERSION = "rect-v2";
const normalizeRadius = () => 0;

export function buildRenderUrl({ baseUrl = "", type, variant, params = {} }) {
  const origin = String(baseUrl || "").replace(/\/$/, "");
  const search = new URLSearchParams();
  search.set("type", type);
  search.set("variant", variant);
  search.set("v", RENDER_VERSION);

  Object.entries(params).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.filter(Boolean).forEach((item) => search.append(key, item));
    } else if (value !== undefined && value !== null && value !== "") {
      search.set(key, String(value));
    }
  });

  return `${origin}/api/render?${search.toString()}`;
}

export function generateHeaderSvg({
  variant,
  name,
  subtitle,
  accents = [],
  theme = "midnight",
  radius = 0,
}) {
  const palette = RENDER_THEMES[theme] || RENDER_THEMES.midnight;
  const title = escapeXml(name || "Your Name");
  const sub = escapeXml(subtitle || "Building thoughtful software");
  const width = 900;
  const height = 180;
  const outerRadius = normalizeRadius(radius, 0);
  const panelRadius = clamp(outerRadius - 4, 0, 32);
  const innerRadius = clamp(outerRadius - 10, 0, 24);

  if (variant === "constellation") {
    const dots = Array.from({ length: 18 }).map((_, i) => {
      const x = 60 + (i * 43) % 780;
      const y = 30 + ((i * 71) % 110);
      return `<circle cx="${x}" cy="${y}" r="2" fill="${palette.subtext}" />`;
    });

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <g opacity="0.7">${dots.join("")}</g>
  <text x="50%" y="50%" text-anchor="middle" font-size="32" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${title}</text>
  <text x="50%" y="68%" text-anchor="middle" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">${sub}</text>
</svg>`;
  }

  if (variant === "signal") {
    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <path d="M40 120 Q90 90 140 120 T240 120 T340 120 T440 120 T540 120 T640 120 T740 120 T860 120" stroke="${palette.accent}" stroke-width="4" fill="none" />
  <text x="60" y="70" font-size="30" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${title}</text>
  <text x="60" y="100" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">${sub}</text>
</svg>`;
  }

  if (variant === "terminal") {
    const lines = [title, sub, ...(accents || []).slice(0, 2).map(escapeXml)];
    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${panelRadius}" fill="${palette.panel}" />
  <rect x="20" y="20" width="${width - 40}" height="${height - 40}" rx="${innerRadius}" fill="#0f1115" stroke="${palette.subtext}" stroke-opacity="0.3" />
  <text x="50" y="60" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">$ githance --profile</text>
  ${lines
    .map((line, index) => {
      const y = 90 + index * 22;
      return `<text x="50" y="${y}" font-size="16" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(line)}</text>`;
    })
    .join("")}
</svg>`;
  }

  if (variant === "stacked") {
    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <rect x="30" y="30" width="${width - 60}" height="60" rx="${panelRadius}" fill="${palette.panel}" />
  <rect x="30" y="100" width="${width - 60}" height="50" rx="${innerRadius}" fill="${palette.accent}" fill-opacity="0.2" />
  <text x="50" y="70" font-size="28" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${title}</text>
  <text x="50" y="132" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">${sub}</text>
</svg>`;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="50%" y="50%" text-anchor="middle" font-size="32" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${title}</text>
</svg>`;
}

export function generateBioSvg({
  variant,
  title,
  summary,
  chips = [],
  theme = "midnight",
  radius = 0,
}) {
  const palette = RENDER_THEMES[theme] || RENDER_THEMES.midnight;
  const width = 900;
  const height = 220;
  const safeChips = chips.filter(Boolean).slice(0, 5);
  const outerRadius = normalizeRadius(radius, 0);
  const panelRadius = clamp(outerRadius - 6, 0, 18);
  const chipRadius = clamp(outerRadius - 10, 0, 16);

  if (variant === "badge") {
    const chipRow = safeChips
      .map((chip, index) => {
        const x = 30 + index * 170;
        return `<rect x="${x}" y="150" width="150" height="32" rx="${chipRadius}" fill="${palette.panel}" />
        <text x="${x + 16}" y="170" font-size="12" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(chip)}</text>`;
      })
      .join("");

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="60" font-size="24" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${escapeXml(
    title
  )}</text>
  <text x="30" y="95" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">${escapeXml(
    summary
  )}</text>
  ${chipRow}
</svg>`;
  }

  if (variant === "timeline") {
    const items = safeChips
      .map((chip, index) => {
        const y = 80 + index * 30;
        return `<circle cx="40" cy="${y}" r="6" fill="${palette.accent}" />
        <text x="60" y="${y + 4}" font-size="14" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(
          chip
        )}</text>`;
      })
      .join("");

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="50" font-size="22" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${escapeXml(
    title
  )}</text>
  <text x="30" y="72" font-size="12" fill="${palette.subtext}" font-family="Inter, sans-serif">${escapeXml(
    summary
  )}</text>
  ${items}
</svg>`;
  }

  if (variant === "spotlight") {
    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <rect x="30" y="40" width="340" height="140" rx="${panelRadius}" fill="${palette.panel}" />
  <rect x="410" y="40" width="460" height="140" rx="${panelRadius}" fill="${palette.panel}" />
  <text x="60" y="80" font-size="18" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${escapeXml(
    title
  )}</text>
  <text x="60" y="110" font-size="12" fill="${palette.subtext}" font-family="Inter, sans-serif">${escapeXml(
    summary
  )}</text>
  <text x="440" y="80" font-size="14" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">Focus</text>
  ${safeChips
    .map((chip, index) => {
      const y = 105 + index * 22;
      return `<text x="440" y="${y}" font-size="12" fill="${palette.subtext}" font-family="Inter, sans-serif">${escapeXml(
        chip
      )}</text>`;
    })
    .join("")}
</svg>`;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="60" font-size="22" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${escapeXml(
    title
  )}</text>
</svg>`;
}

export function generateStackSvg({ variant, stack = [], theme = "midnight", radius = 0 }) {
  const palette = RENDER_THEMES[theme] || RENDER_THEMES.midnight;
  const safeStack = stack.filter(Boolean);
  const width = 900;
  const height = 180;
  const outerRadius = normalizeRadius(radius, 0);
  const panelRadius = clamp(outerRadius - 8, 0, 14);
  const barRadius = clamp(outerRadius - 12, 0, 8);

  if (variant === "grid") {
    const cols = 4;
    const gap = 16;
    const padding = 30;
    const cardWidth = Math.floor((width - padding * 2 - gap * (cols - 1)) / cols);

    const cards = safeStack.slice(0, 8).map((tech, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = padding + col * (cardWidth + gap);
      const y = 40 + row * 60;

      return `<rect x="${x}" y="${y}" width="${cardWidth}" height="44" rx="${panelRadius}" fill="${palette.panel}" />
      <text x="${x + 16}" y="${y + 28}" font-size="12" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(
        tech
      )}</text>`;
    });

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="28" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">Tech Stack</text>
  ${cards.join("")}
</svg>`;
  }

  if (variant === "orbit") {
    const centerX = 140;
    const centerY = 100;

    const nodes = safeStack.slice(0, 5).map((tech, index) => {
      const angle = (index / 5) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 50;
      const y = centerY + Math.sin(angle) * 50;
      return `<circle cx="${x}" cy="${y}" r="10" fill="${palette.accent}" />
      <text x="${x + 18}" y="${y + 4}" font-size="10" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(
        tech
      )}</text>`;
    });

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <circle cx="${centerX}" cy="${centerY}" r="50" stroke="${palette.subtext}" stroke-opacity="0.3" fill="none" />
  <circle cx="${centerX}" cy="${centerY}" r="18" fill="${palette.panel}" />
  <text x="${centerX}" y="${centerY + 4}" text-anchor="middle" font-size="10" fill="${palette.text}" font-family="Inter, sans-serif">Stack</text>
  ${nodes.join("")}
  <text x="260" y="60" font-size="16" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">${escapeXml(
    safeStack[0] || "Next.js"
  )}</text>
  <text x="260" y="85" font-size="12" fill="${palette.subtext}" font-family="Inter, sans-serif">Core tools powering daily work.</text>
</svg>`;
  }

  if (variant === "barcode") {
    const bars = safeStack.slice(0, 6).map((tech, index) => {
      const x = 30 + index * 50;
      const height = 80 + (index % 3) * 15;
      const y = 60 - (index % 3) * 15;

      return `<rect x="${x}" y="${y}" width="30" height="${height}" rx="${barRadius}" fill="${palette.panel}" />
      <text x="${x + 40}" y="${y + 18}" font-size="10" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(
        tech
      )}</text>`;
    });

    return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="30" font-size="14" fill="${palette.subtext}" font-family="Inter, sans-serif">Tech Stack</text>
  ${bars.join("")}
</svg>`;
  }

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <text x="30" y="60" font-size="16" fill="${palette.text}" font-family="Inter, sans-serif">${escapeXml(
    safeStack.join(", ")
  )}</text>
</svg>`;
}

export function generateTrophySvg({
  title = "Highlights",
  achievements = [],
  columns = 4,
  theme = "midnight",
  radius = 0,
}) {
  const palette = RENDER_THEMES[theme] || RENDER_THEMES.midnight;
  const safeAchievements = achievements.filter(Boolean);
  const outerRadius = normalizeRadius(radius, 0);
  const panelRadius = clamp(outerRadius - 6, 0, 24);
  const cardRadius = clamp(outerRadius - 10, 0, 18);
  const colCount = clamp(Number(columns) || 4, 2, 5);
  const gap = 16;
  const padding = 24;
  const cardHeight = 110;
  const width = 900;
  const usable = width - padding * 2 - gap * (colCount - 1);
  const cardWidth = Math.floor(usable / colCount);
  const rows = Math.max(1, Math.ceil(safeAchievements.length / colCount));
  const height = padding * 2 + 70 + rows * cardHeight + (rows - 1) * gap;

  const cards = safeAchievements
    .map((text, index) => {
      const row = Math.floor(index / colCount);
      const col = index % colCount;
      const x = padding + col * (cardWidth + gap);
      const y = padding + 50 + row * (cardHeight + gap);

      return `
      <g>
        <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="${cardRadius}" fill="${palette.panel}" />
        <circle cx="${x + 28}" cy="${y + 30}" r="14" fill="${palette.accent}" />
        <text x="${x + 28}" y="${y + 35}" font-size="16" text-anchor="middle" fill="#0b0d0f" font-family="Inter, sans-serif">*</text>
        <text x="${x + 20}" y="${y + 70}" font-size="14" fill="${palette.text}" font-family="Inter, sans-serif">
          ${escapeXml(text)}
        </text>
      </g>`;
    })
    .join("");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" rx="${outerRadius}" fill="${palette.bg}" />
  <rect x="12" y="12" width="${width - 24}" height="${height - 24}" rx="${panelRadius}" fill="none" stroke="${palette.panel}" />
  <text x="${padding}" y="${padding + 16}" font-size="20" fill="${palette.text}" font-family="Inter, sans-serif" font-weight="600">
    ${escapeXml(title)}
  </text>
  <text x="${padding}" y="${padding + 40}" font-size="12" fill="${palette.subtext}" font-family="Inter, sans-serif">
    Achievement showcase
  </text>
  ${cards}
</svg>`;
}

export function trophySvgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function buildTrophyUrl({
  baseUrl = "",
  title = "Highlights",
  achievements = [],
  theme = "midnight",
  columns = 4,
  stickers = "",
}) {
  return buildRenderUrl({
    baseUrl,
    type: "trophy",
    variant: "default",
    params: {
      title,
      theme,
      columns,
      a: achievements,
      ...(stickers ? { stickers } : {}),
    },
  });
}
