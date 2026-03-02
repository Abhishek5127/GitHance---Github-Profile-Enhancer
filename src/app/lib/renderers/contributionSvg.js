const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 180;
function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCount(value) {
  const parsed = Number(value || 0);
  return new Intl.NumberFormat("en-US").format(Number.isFinite(parsed) ? parsed : 0);
}

export default function renderContributionSvg(stats = {}, options = {}) {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;

  const commits7 = Number(stats.recent_commits_7 || 0);
  const commits30 = Number(stats.recent_commits_30 || 0);
  const active30 = Number(stats.active_days_30 || 0);
  const active90 = Number(stats.active_days_90 || 0);
  const lastUpdated = String(stats.last_updated || "").replace("T", " ").slice(0, 16);
  const username = escapeXml(stats.github_username || "github-user");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHance contribution summary for ${username}">
  <style>
    .title { fill: #f8fafc; font: 700 18px 'Segoe UI', Inter, sans-serif; }
    .sub { fill: #94a3b8; font: 500 12px 'Segoe UI', Inter, sans-serif; }
    .label { fill: #cbd5e1; font: 600 12px 'Segoe UI', Inter, sans-serif; }
    .value { fill: #ffffff; font: 700 18px 'Segoe UI', Inter, sans-serif; }
    .tiny { fill: #93c5fd; font: 600 11px 'Segoe UI', Inter, sans-serif; }
  </style>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" fill="none" stroke="#1f2937" />

  <text x="24" y="38" class="title">Contribution Summary</text>
  <text x="24" y="56" class="sub">@${username}</text>
  <text x="${width - 24}" y="56" class="sub" text-anchor="end">Updated ${escapeXml(lastUpdated || "N/A")} UTC</text>

  <rect x="24" y="72" width="${Math.floor((width - 60) / 2)}" height="88" rx="12" fill="#111827" stroke="#1e293b" />
  <rect x="${Math.floor(width / 2) + 6}" y="72" width="${Math.floor((width - 60) / 2)}" height="88" rx="12" fill="#111827" stroke="#1e293b" />

  <text x="40" y="98" class="label">Commits (7 days)</text>
  <text x="40" y="132" class="value text-sm">${escapeXml(formatCount(commits7))}</text>
  <text x="40" y="150" class="tiny">Last 30 days: ${escapeXml(formatCount(commits30))}</text>

  <text x="${Math.floor(width / 2) + 22}" y="98" class="label">Active days</text>
  <text x="${Math.floor(width / 2) + 22}" y="132" class="value">${escapeXml(formatCount(active30))}</text>
  <text x="${Math.floor(width / 2) + 22}" y="150" class="tiny">30d / 90d: ${escapeXml(formatCount(active30))} / ${escapeXml(formatCount(active90))}</text>
</svg>`.trim();
}
