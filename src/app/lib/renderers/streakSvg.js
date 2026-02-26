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

export default function renderStreakSvg(stats = {}, options = {}) {
  const width = DEFAULT_WIDTH;
  const height = DEFAULT_HEIGHT;

  const currentStreak = Number(stats.current_streak || 0);
  const longestStreak = Number(stats.longest_streak || 0);
  const commits30 = Number(stats.recent_commits_30 || 0);
  const username = escapeXml(stats.github_username || "github-user");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHance commit streak for ${username}">
  <defs>
    <linearGradient id="githanceStreakBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
  </defs>
  <style>
    .title { fill: #f8fafc; font: 700 18px 'Segoe UI', Inter, sans-serif; }
    .sub { fill: #94a3b8; font: 500 12px 'Segoe UI', Inter, sans-serif; }
    .label { fill: #cbd5e1; font: 600 12px 'Segoe UI', Inter, sans-serif; }
    .value { fill: #ffffff; font: 700 18px 'Segoe UI', Inter, sans-serif; }
    .tiny { fill: #fdba74; font: 600 12px 'Segoe UI', Inter, sans-serif; }
  </style>
  <rect width="${width}" height="${height}" rx="16" fill="url(#githanceStreakBg)" />
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" fill="none" stroke="#1f2937" />

  <text x="24" y="38" class="title">Commit Streak</text>
  <text x="24" y="56" class="sub">@${username}</text>

  <rect x="24" y="72" width="${Math.floor((width - 60) / 2)}" height="88" rx="12" fill="#111827" stroke="#1e293b" />
  <rect x="${Math.floor(width / 2) + 6}" y="72" width="${Math.floor((width - 60) / 2)}" height="88" rx="12" fill="#111827" stroke="#1e293b" />

  <text x="40" y="96" class="label">Current</text>
  <text x="40" y="134" class="value text-sm">${escapeXml(formatCount(currentStreak))}</text>
  <text x="122" y="134" class="tiny">days</text>

  <text x="${Math.floor(width / 2) + 22}" y="96" class="label">Longest</text>
  <text x="${Math.floor(width / 2) + 22}" y="134" class="value">${escapeXml(formatCount(longestStreak))}</text>
  <text x="${Math.floor(width / 2) + 112}" y="134" class="tiny">days</text>

  <text x="${width - 24}" y="154" class="sub" text-anchor="end">Commits in last 30 days: ${escapeXml(formatCount(commits30))}</text>
</svg>`.trim();
}
