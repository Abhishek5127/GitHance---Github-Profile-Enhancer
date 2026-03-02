export const CONTRIBUTION_GRAPH_ASSET_PATH = "assets/readme/contribution-graph.svg";
export const CONTRIBUTION_GRAPH_WORKFLOW_PATH = ".github/workflows/update-contribution-graph.yml";
export const CONTRIBUTION_GRAPH_SCRIPT_PATH = ".github/scripts/update-contribution-graph.mjs";

function normalizeVariant(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["classic", "neon", "sunset"].includes(normalized)) {
    return normalized;
  }
  return "classic";
}

export function buildContributionGraphWorkflow({
  username = "",
  variant = "classic",
  assetPath = CONTRIBUTION_GRAPH_ASSET_PATH,
  scriptPath = CONTRIBUTION_GRAPH_SCRIPT_PATH,
} = {}) {
  const safeUsername = String(username || "").trim();
  const safeVariant = normalizeVariant(variant);
  const safeAssetPath = String(assetPath || CONTRIBUTION_GRAPH_ASSET_PATH).trim();
  const safeScriptPath = String(scriptPath || CONTRIBUTION_GRAPH_SCRIPT_PATH).trim();

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
          GRAPH_VARIANT: ${safeVariant}
          GRAPH_OUTPUT_PATH: ${safeAssetPath}
        run: node ${safeScriptPath}

      - name: Commit and push changes
        run: |
          if [[ -z "$(git status --porcelain -- ${safeAssetPath})" ]]; then
            echo "No contribution graph changes."
            exit 0
          fi

          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add ${safeAssetPath}
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
const WEEKS = 53;

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

function renderHeatmapSvg({ username, days, variant }) {
  const theme = VARIANTS[variant] || VARIANTS.classic;
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
  const rawStart = new Date(endDate.getTime() - (WEEKS * 7 - 1) * DAY_MS);
  const startDate = startOfWeek(rawStart);

  const paddingX = 22;
  const paddingY = 18;
  const cell = 10;
  const gap = 3;
  const gridX = paddingX + 56;
  const gridY = paddingY + 38;
  const gridWidth = WEEKS * (cell + gap) - gap;
  const gridHeight = 7 * (cell + gap) - gap;
  const width = Math.max(900, gridX + gridWidth + paddingX);
  const height = Math.max(280, gridY + gridHeight + paddingY + 34);

  const cells = [];
  const monthLabels = [];
  let previousMonth = "";

  for (let week = 0; week < WEEKS; week += 1) {
    const weekDate = new Date(startDate.getTime() + week * 7 * DAY_MS);
    const isoWeekDate = toIsoDate(weekDate);
    const month = isoWeekDate.slice(5, 7);

    if (!previousMonth || month !== previousMonth) {
      monthLabels.push({
        x: gridX + week * (cell + gap),
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
        x: gridX + week * (cell + gap),
        y: gridY + day * (cell + gap),
        fill,
        isoDate,
        count,
      });
    }
  }

  const monthText = monthLabels
    .map(
      (entry) =>
        \`<text x="\${entry.x}" y="\${gridY - 10}" fill="\${theme.month}" font-size="10" font-family="Inter, Segoe UI, sans-serif">\${escapeXml(entry.label)}</text>\`
    )
    .join("");

  const dayLabels = [
    { label: "Mon", day: 1 },
    { label: "Wed", day: 3 },
    { label: "Fri", day: 5 },
  ]
    .map((entry) => {
      const y = gridY + entry.day * (cell + gap) + 8;
      return \`<text x="\${gridX - 40}" y="\${y}" fill="\${theme.dayLabel}" font-size="10" font-family="Inter, Segoe UI, sans-serif">\${entry.label}</text>\`;
    })
    .join("");

  const cellsMarkup = cells
    .map(
      (entry) =>
        \`<rect x="\${entry.x}" y="\${entry.y}" width="\${cell}" height="\${cell}" rx="2.4" fill="\${entry.fill}"><title>\${entry.isoDate}: \${entry.count} contribution\${entry.count === 1 ? "" : "s"}</title></rect>\`
    )
    .join("");

  const legendStartX = gridX + gridWidth - 4 * (cell + gap) - 104;
  const legendY = gridY + gridHeight + 20;
  const legendCells = theme.levels
    .map(
      (fill, index) =>
        \`<rect x="\${legendStartX + 64 + index * (cell + gap)}" y="\${legendY - cell + 1}" width="\${cell}" height="\${cell}" rx="2" fill="\${fill}" />\`
    )
    .join("");

  return \`
<svg width="\${width}" height="\${height}" viewBox="0 0 \${width} \${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Contribution graph for \${escapeXml(username)}">
  <defs>
    <linearGradient id="graph-bg-\${variant}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="\${theme.bg}" />
      <stop offset="100%" stop-color="\${theme.panel}" />
    </linearGradient>
  </defs>
  <rect width="\${width}" height="\${height}" rx="16" fill="url(#graph-bg-\${variant})" />
  <rect x="8" y="8" width="\${width - 16}" height="\${height - 16}" rx="12" fill="none" stroke="\${theme.border}" />
  <text x="\${paddingX}" y="\${paddingY + 8}" fill="\${theme.title}" font-size="16" font-family="Inter, Segoe UI, sans-serif" font-weight="700">Contribution Graph</text>
  <text x="\${paddingX}" y="\${paddingY + 28}" fill="\${theme.subtitle}" font-size="12" font-family="Inter, Segoe UI, sans-serif">@\${escapeXml(username)}</text>
  \${monthText}
  \${dayLabels}
  \${cellsMarkup}
  <text x="\${legendStartX}" y="\${legendY}" fill="\${theme.legend}" font-size="10" font-family="Inter, Segoe UI, sans-serif">Less</text>
  \${legendCells}
  <text x="\${legendStartX + 64 + 5 * (cell + gap)}" y="\${legendY}" fill="\${theme.legend}" font-size="10" font-family="Inter, Segoe UI, sans-serif">More</text>
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
  const outputPath = String(process.env.GRAPH_OUTPUT_PATH || "${safeOutputPath}").trim();

  if (!token) {
    throw new Error("GITHUB_TOKEN is required");
  }
  if (!username) {
    throw new Error("GITHUB_USERNAME (or repository owner) is required");
  }

  const days = await fetchContributionDays({ token, username });
  const svg = renderHeatmapSvg({ username, days, variant });

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
