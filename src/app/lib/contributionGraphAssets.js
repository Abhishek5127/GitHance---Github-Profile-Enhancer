export const CONTRIBUTION_GRAPH_ASSET_PATH = "assets/readme/contribution-graph.svg";
export const CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH =
  "assets/readme/contribution-graph-monthly.svg";
export const CONTRIBUTION_GRAPH_WORKFLOW_PATH = ".github/workflows/update-contribution-graph.yml";
export const CONTRIBUTION_GRAPH_SCRIPT_PATH = ".github/scripts/update-contribution-graph.mjs";

function normalizeVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["classic", "neon", "sunset", "tortoise"].includes(normalized)) {
    return normalized;
  }
  return "classic";
}

function normalizeRange(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["yearly", "monthly"].includes(normalized)) {
    return normalized;
  }
  return "yearly";
}

export function resolveContributionAssetPath(range = "yearly") {
  const normalizedRange = normalizeRange(range);
  return normalizedRange === "monthly"
    ? CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH
    : CONTRIBUTION_GRAPH_ASSET_PATH;
}

export function buildContributionGraphWorkflow({
  username = "",
  yearlyVariant = "classic",
  monthlyVariant = "classic",
  yearlyAssetPath = CONTRIBUTION_GRAPH_ASSET_PATH,
  monthlyAssetPath = CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH,
  includeMonthly = true,
  scriptPath = CONTRIBUTION_GRAPH_SCRIPT_PATH,
} = {}) {
  const safeUsername = String(username || "").trim();
  const safeYearlyVariant = normalizeVariant(yearlyVariant);
  const safeMonthlyVariant = normalizeVariant(monthlyVariant);
  const safeYearlyAssetPath = String(
    yearlyAssetPath || CONTRIBUTION_GRAPH_ASSET_PATH
  ).trim();
  const safeMonthlyAssetPath = String(
    monthlyAssetPath || CONTRIBUTION_GRAPH_MONTHLY_ASSET_PATH
  ).trim();
  const safeIncludeMonthly = Boolean(includeMonthly);
  const safeScriptPath = String(scriptPath || CONTRIBUTION_GRAPH_SCRIPT_PATH).trim();
  const statusTargetPaths = safeIncludeMonthly
    ? `${safeYearlyAssetPath} ${safeMonthlyAssetPath}`
    : safeYearlyAssetPath;
  const gitAddPaths = statusTargetPaths;
  const monthlyStep = safeIncludeMonthly
    ? `
      - name: Generate monthly contribution graph asset
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_USERNAME: ${safeUsername || "${{ github.repository_owner }}"}
          GRAPH_VARIANT: ${safeMonthlyVariant}
          GRAPH_RANGE: monthly
          GRAPH_OUTPUT_PATH: ${safeMonthlyAssetPath}
        run: node ${safeScriptPath}
`
    : "";

  return `name: Update Contribution Graph

on:
  workflow_dispatch:
  schedule:
    - cron: "0 */12 * * *"

permissions:
  contents: write

jobs:
  refresh-graph:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Generate contribution graph asset
        env:
          GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          GITHUB_USERNAME: ${safeUsername || "${{ github.repository_owner }}"}
          GRAPH_VARIANT: ${safeYearlyVariant}
          GRAPH_RANGE: yearly
          GRAPH_OUTPUT_PATH: ${safeYearlyAssetPath}
        run: node ${safeScriptPath}
${monthlyStep}

      - name: Commit and push changes
        run: |
          if [[ -z "$(git status --porcelain -- ${statusTargetPaths})" ]]; then
            echo "No contribution graph changes."
            exit 0
          fi

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add ${gitAddPaths}
          git commit -m "chore(readme): refresh contribution graph asset"
          git push
`;
}

export function buildContributionGraphUpdaterScript({
  outputPath = CONTRIBUTION_GRAPH_ASSET_PATH,
} = {}) {
  const safeOutputPath = String(outputPath || CONTRIBUTION_GRAPH_ASSET_PATH).trim();

  return `import fs from "node:fs/promises";
import path from "node:path";

const DAY_MS = 24 * 60 * 60 * 1000;
const YEARLY_WEEKS = 53;
const MONTHLY_WEEKS = 6;
const TORTOISE_ASSET_FILENAME = "tortoise.svg";

const VARIANTS = {
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
  tortoise: {
    bg: "#ffffff",
    panel: "#f6f7f9",
    border: "#d8dde3",
    title: "#101418",
    subtitle: "#4f5b66",
    month: "#4f5b66",
    legend: "#4f5b66",
    dayLabel: "#4f5b66",
    levels: ["#eef2f5", "#dde4ea", "#c8d1da", "#adb9c5", "#8e9ba9"],
  },
};

const GRAPHQL_QUERY = \`
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
\`;

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (Object.prototype.hasOwnProperty.call(VARIANTS, normalized)) {
    return normalized;
  }
  return "classic";
}

function normalizeRange(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "monthly" ? "monthly" : "yearly";
}

function buildTortoiseDecorationImage({
  x = 0,
  y = 0,
  width = 64,
  height = 64,
  href = "",
} = {}) {
  const safeHref = String(href || "").trim();
  if (safeHref) {
    return \`<image href="\${escapeXml(safeHref)}" x="\${x}" y="\${y}" width="\${width}" height="\${height}" preserveAspectRatio="xMidYMid meet" />\`;
  }

  return \`
<g transform="translate(\${x} \${y})">
  <ellipse cx="\${(width * 0.5).toFixed(2)}" cy="\${(height * 0.62).toFixed(2)}" rx="\${(width * 0.26).toFixed(2)}" ry="\${(height * 0.2).toFixed(2)}" fill="#85c46a" stroke="#4d7f3b" stroke-width="1.6" />
  <ellipse cx="\${(width * 0.5).toFixed(2)}" cy="\${(height * 0.62).toFixed(2)}" rx="\${(width * 0.13).toFixed(2)}" ry="\${(height * 0.1).toFixed(2)}" fill="#6ca84f" opacity="0.7" />
  <circle cx="\${(width * 0.76).toFixed(2)}" cy="\${(height * 0.58).toFixed(2)}" r="\${(width * 0.07).toFixed(2)}" fill="#9ccf86" stroke="#5f8c49" stroke-width="1.2" />
  <circle cx="\${(width * 0.79).toFixed(2)}" cy="\${(height * 0.56).toFixed(2)}" r="\${(width * 0.01).toFixed(2)}" fill="#263238" />
  <ellipse cx="\${(width * 0.63).toFixed(2)}" cy="\${(height * 0.74).toFixed(2)}" rx="\${(width * 0.05).toFixed(2)}" ry="\${(height * 0.04).toFixed(2)}" fill="#9ccf86" />
  <ellipse cx="\${(width * 0.37).toFixed(2)}" cy="\${(height * 0.74).toFixed(2)}" rx="\${(width * 0.05).toFixed(2)}" ry="\${(height * 0.04).toFixed(2)}" fill="#9ccf86" />
</g>\`.trim();
}

async function loadTortoiseDataUri(outputPath) {
  const outputDir = path.dirname(path.resolve(process.cwd(), outputPath));
  const tortoisePath = path.join(outputDir, TORTOISE_ASSET_FILENAME);

  try {
    const rawSvg = await fs.readFile(tortoisePath, "utf8");
    return \`data:image/svg+xml;utf8,\${encodeURIComponent(rawSvg)}\`;
  } catch {
    return "";
  }
}

function toIsoDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function startOfWeek(date) {
  const copy = new Date(date.getTime());
  const day = copy.getUTCDay();
  copy.setUTCDate(copy.getUTCDate() - day);
  return copy;
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

function formatMonthLabel(isoDate) {
  const parsed = new Date(isoDate + "T00:00:00.000Z");
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
}

function renderHeatmapSvg({ username, days, variant, range }) {
  const theme = VARIANTS[variant] || VARIANTS.classic;
  const normalizedRange = normalizeRange(range);
  const effectiveRange = normalizedRange;
  const weeks = effectiveRange === "monthly" ? MONTHLY_WEEKS : YEARLY_WEEKS;
  const rangeLabel = effectiveRange === "monthly" ? "Last 30 Days" : "Last 12 Months";
  const normalizedDays = new Map();

  days.forEach((entry) => {
    const isoDate = toIsoDate(entry?.date);
    const count = Number(entry?.count || 0);
    if (!isoDate || !Number.isFinite(count) || count < 0) return;
    normalizedDays.set(isoDate, Math.floor(count));
  });

  const levelFor = buildLevelResolver([...normalizedDays.values()]);

  const today = new Date();
  const endDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const rawStart = new Date(endDate.getTime() - (weeks - 1) * 7 * DAY_MS);
  const startDate = startOfWeek(rawStart);

  const paddingX = 22;
  const paddingY = 18;
  const cell = 10;
  const gap = 3;
  const weekWidth = cell + gap;
  const gridWidth = weeks * weekWidth - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  const leftLabelSpace = 52;
  const targetWidth = effectiveRange === "monthly" ? 560 : 1120;
  const width = Math.max(targetWidth, paddingX + leftLabelSpace + gridWidth + paddingX);
  const gridX = Math.max(Math.floor((width - gridWidth) / 2), paddingX + leftLabelSpace);

  const titleY = paddingY + 12;
  const subtitleY = titleY + 18;
  const monthY = subtitleY + 18;
  const gridY = monthY + 12;
  const legendY = gridY + gridHeight + 24;
  const minHeight = legendY + paddingY + 6;
  const targetHeight = effectiveRange === "monthly" ? 228 : 320;
  const height = Math.max(targetHeight, minHeight);
  const yShift = Math.floor((height - minHeight) / 2);
  const shiftedTitleY = titleY + yShift;
  const shiftedSubtitleY = subtitleY + yShift;
  const shiftedMonthY = monthY + yShift;
  const shiftedGridY = gridY + yShift;
  const shiftedLegendY = legendY + yShift;
  const dayLabelX = gridX - 40;

  const cells = [];
  const monthLabels = [];
  let previousMonth = "";

  for (let week = 0; week < weeks; week += 1) {
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
      const count = Number(normalizedDays.get(isoDate) || 0);
      const level = levelFor(count);
      const fill = theme.levels[Math.max(0, Math.min(level, theme.levels.length - 1))];

      cells.push({
        x: gridX + week * weekWidth,
        y: shiftedGridY + day * (cell + gap),
        fill,
        isoDate,
        count,
      });
    }
  }

  const monthText = monthLabels
    .map(
      (entry) =>
        \`<text x="\${entry.x}" y="\${shiftedMonthY}" fill="\${theme.month}" font-size="10" font-family="Inter, Segoe UI, sans-serif">\${escapeXml(entry.label)}</text>\`
    )
    .join("");

  const dayLabels = [
    { label: "Mon", day: 1 },
    { label: "Wed", day: 3 },
    { label: "Fri", day: 5 },
  ]
    .map((entry) => {
      const y = shiftedGridY + entry.day * (cell + gap) + 8;
      return \`<text x="\${dayLabelX}" y="\${y}" fill="\${theme.dayLabel}" font-size="10" font-family="Inter, Segoe UI, sans-serif">\${entry.label}</text>\`;
    })
    .join("");

  const cellsMarkup = cells
    .map(
      (entry) =>
        \`<rect x="\${entry.x}" y="\${entry.y}" width="\${cell}" height="\${cell}" rx="2.4" fill="\${entry.fill}"><title>\${entry.isoDate}: \${entry.count} contribution\${entry.count === 1 ? "" : "s"}</title></rect>\`
    )
    .join("");

  const legendStartX = gridX + gridWidth - 4 * (cell + gap) - 104;
  const tortoiseDecoration = "";
  const cardFill = variant === "tortoise" ? theme.bg : "none";
  const legendCells = theme.levels
    .map(
      (fill, index) =>
        \`<rect x="\${legendStartX + 64 + index * (cell + gap)}" y="\${shiftedLegendY - cell + 1}" width="\${cell}" height="\${cell}" rx="2" fill="\${fill}" />\`
    )
    .join("");

  return \`
<svg width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Contribution graph for \${escapeXml(username)}">
  <rect x="8" y="8" width="\${width - 16}" height="\${height - 16}" rx="12" fill="\${cardFill}" stroke="\${theme.border}" />
  <text x="\${paddingX}" y="\${shiftedTitleY}" fill="\${theme.title}" font-size="16" font-family="Inter, Segoe UI, sans-serif" font-weight="700">Contribution Graph</text>
  <text x="\${paddingX}" y="\${shiftedSubtitleY}" fill="\${theme.subtitle}" font-size="12" font-family="Inter, Segoe UI, sans-serif">@\${escapeXml(username)}</text>
  <text x="\${width - paddingX}" y="\${shiftedSubtitleY}" fill="\${theme.subtitle}" font-size="11" text-anchor="end" font-family="Inter, Segoe UI, sans-serif">\${rangeLabel}</text>
  \${monthText}
  \${dayLabels}
  \${cellsMarkup}
  <text x="\${legendStartX}" y="\${shiftedLegendY}" fill="\${theme.legend}" font-size="10" font-family="Inter, Segoe UI, sans-serif">Less</text>
  \${legendCells}
  <text x="\${legendStartX + 64 + 5 * (cell + gap)}" y="\${shiftedLegendY}" fill="\${theme.legend}" font-size="10" font-family="Inter, Segoe UI, sans-serif">More</text>
  \${tortoiseDecoration}
</svg>\`.trim();
}

async function fetchContributionDays({ token, username }) {
  const now = new Date();
  const from = new Date(now.getTime() - 366 * DAY_MS);

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: \`Bearer \${token}\`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      query: GRAPHQL_QUERY,
      variables: {
        login: username,
        from: from.toISOString(),
        to: now.toISOString(),
      },
    }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors?.length) {
    const message =
      payload?.errors?.[0]?.message ||
      payload?.message ||
      "Failed to fetch contribution calendar";
    throw new Error(message);
  }

  const weeks = payload?.data?.user?.contributionsCollection?.contributionCalendar?.weeks || [];
  return weeks
    .flatMap((week) => (Array.isArray(week?.contributionDays) ? week.contributionDays : []))
    .map((entry) => ({
      date: toIsoDate(entry?.date),
      count: Number(entry?.contributionCount || 0),
    }))
    .filter((entry) => entry.date);
}

async function main() {
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  const username = String(
    process.env.GITHUB_USERNAME ||
      process.env.GITHUB_REPOSITORY_OWNER ||
      process.env.GITHUB_ACTOR ||
      ""
  )
    .trim()
    .toLowerCase();
  const variant = normalizeVariant(process.env.GRAPH_VARIANT || "classic");
  const range = normalizeRange(process.env.GRAPH_RANGE || "yearly");
  const outputPath = String(process.env.GRAPH_OUTPUT_PATH || "${safeOutputPath}").trim();

  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  if (!username) {
    throw new Error("GITHUB_USERNAME (or repository owner) is required");
  }

  const days = await fetchContributionDays({ token, username });
  const svg = renderHeatmapSvg({
    username,
    days,
    variant,
    range,
  });

  const absoluteOutputPath = path.resolve(process.cwd(), outputPath);
  await fs.mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await fs.writeFile(absoluteOutputPath, svg + "\\n", "utf8");
  console.log(\`Contribution graph updated at \${outputPath}\`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
`;
}
