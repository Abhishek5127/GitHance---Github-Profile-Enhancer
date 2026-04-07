const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 154;

function resolveDimension(value, fallback, min = 240) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.max(min, Math.floor(parsed));
}
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

function resolveMetricText(stats, metric, window) {
  const normalizedMetric = String(metric || "last_repo").toLowerCase();
  const windowDays = Number(window) || 0;

  if (normalizedMetric === "total_commits") {
    return {
      title: "Commit Contributions (365d)",
      value: formatCount(stats.total_commits || 0),
      subvalue: "GitHub commit contributions in the past year",
    };
  }

  if (normalizedMetric === "active_days") {
    if (windowDays === 90) {
      return {
        title: "Active Days (90d)",
        value: formatCount(stats.active_days_90 || 0),
        subvalue: "Days with at least one commit",
      };
    }

    if (windowDays === 30) {
      return {
        title: "Active Days (30d)",
        value: formatCount(stats.active_days_30 || 0),
        subvalue: "Days with at least one commit",
      };
    }

    return {
      title: "Active Days",
      value: `${formatCount(stats.active_days_30 || 0)} / ${formatCount(stats.active_days_90 || 0)}`,
      subvalue: "30 day / 90 day windows",
    };
  }

  if (normalizedMetric === "top_repo") {
    return {
      title: "Top Repo (Recent Activity)",
      value: String(stats.top_repo_recent || "N/A"),
      subvalue: "Highest commit count in the last 30 days",
    };
  }

  if (normalizedMetric === "last_repo") {
    return {
      title: "Last Worked Repository",
      value: String(stats.last_repo || "N/A"),
      subvalue: "Most recently updated repository",
    };
  }

  return {
    title: "Repository Metric",
    value: "N/A",
    subvalue: "Unknown metric requested",
  };
}

export function renderRepoSvg(stats = {}, options = {}) {
  const width = resolveDimension(
    options?.width ?? options?.w,
    DEFAULT_WIDTH
  );
  const height = resolveDimension(
    options?.height ?? options?.h,
    DEFAULT_HEIGHT,
    132
  );
  const metric = String(options.metric || "last_repo");
  const metricText = resolveMetricText(stats, metric, options.window);
  const lastUpdated = String(stats.last_updated || "").replace("T", " ").slice(0, 16);
  const username = escapeXml(stats.github_username || "github-user");

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHance repository metric ${escapeXml(metric)} for ${username}">
  <style>
    .title { fill: #f8fafc; font: 700 17px 'Segoe UI', Inter, sans-serif; }
    .sub { fill: #94a3b8; font: 500 12px 'Segoe UI', Inter, sans-serif; }
    .value { fill: #fef3c7; font: 700 18px 'Segoe UI', Inter, sans-serif; }
    .caption { fill: #cbd5e1; font: 600 12px 'Segoe UI', Inter, sans-serif; }
  </style>
  <rect x="10" y="10" width="${width - 20}" height="${height - 20}" rx="12" fill="none" stroke="#1f2937" />

  <text x="24" y="36" class="title">${escapeXml(metricText.title)}</text>
  <text x="24" y="54" class="sub">@${username}</text>

  <rect x="24" y="68" width="${width - 48}" height="54" rx="10" fill="#111827" stroke="#1e293b" />
  <text x="38" y="98" class="value">${escapeXml(metricText.value)}</text>
  <text x="24" y="138" class="caption">${escapeXml(metricText.subvalue)}</text>
</svg>`.trim();
}

export default renderRepoSvg;
