"use client";

import { useState } from "react";
import Image from "next/image";

const CARD = "rounded-3xl border border-white/10 bg-white/5 p-6";
const PANEL = "rounded-2xl border border-white/10 bg-[#0f1115] p-4";
const HEATMAP_COLORS = ["#1f2937", "#0f766e", "#14b8a6", "#22d3ee", "#67e8f9"];

const PRIORITY_TONES = {
  high: "border-red-400/40 bg-red-500/10 text-red-200",
  medium: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  low: "border-cyan-300/40 bg-cyan-400/10 text-cyan-200",
};

const SEVERITY_TONES = {
  high: "border-red-400/40 bg-red-500/10 text-red-200",
  medium: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  low: "border-cyan-300/40 bg-cyan-400/10 text-cyan-200",
  minimal: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  unknown: "border-zinc-400/40 bg-zinc-500/10 text-zinc-200",
};

const LEVEL_TONES = {
  high: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  moderate: "border-cyan-300/40 bg-cyan-500/10 text-cyan-200",
  low: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  inactive: "border-zinc-400/40 bg-zinc-500/10 text-zinc-200",
  growing: "border-cyan-300/40 bg-cyan-500/10 text-cyan-200",
  limited: "border-zinc-400/40 bg-zinc-500/10 text-zinc-200",
  highly_collaborative: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  moderately_collaborative: "border-cyan-300/40 bg-cyan-500/10 text-cyan-200",
  limited_collaboration: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  solo_focused: "border-zinc-400/40 bg-zinc-500/10 text-zinc-200",
  upward: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
  downward: "border-red-400/40 bg-red-500/10 text-red-200",
  stable: "border-cyan-300/40 bg-cyan-500/10 text-cyan-200",
};

const DASHBOARD_TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "projects", label: "Projects" },
  { id: "impact", label: "Impact" },
  { id: "quality", label: "Quality" },
];

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function exact(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(num(value, 0))));
}

function compact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, Math.floor(num(value, 0))));
}

function pct(value, digits = 0) {
  const parsed = num(value, 0) * (value <= 1 ? 100 : 1);
  return `${parsed.toFixed(digits)}%`;
}

function startCase(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ageLabel(days) {
  const safe = Math.max(0, Math.floor(num(days, 0)));
  const years = Math.floor(safe / 365);
  const months = Math.floor((safe % 365) / 30);
  if (!years) return `${months}m`;
  if (!months) return `${years}y`;
  return `${years}y ${months}m`;
}

function daysSince(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (24 * 60 * 60 * 1000)));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toIsoDay(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

function toneFor(map, key, fallback = "border-white/20 bg-white/10 text-white/70") {
  return map?.[String(key || "").toLowerCase()] || fallback;
}

function SectionTitle({ eyebrow, title, description = "" }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-white/40">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      {description ? <p className="mt-2 text-sm text-white/60">{description}</p> : null}
    </div>
  );
}

function Badge({ label, tone = "border-white/20 bg-white/10 text-white/70" }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${tone}`}>
      {label}
    </span>
  );
}

function MetricTile({ label, value, hint = "" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  );
}

function Gauge({ score = 0, label = "Score" }) {
  const safe = Math.max(0, Math.min(100, Math.round(num(score, 0))));
  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{label}</h3>
      <div className="mt-4 flex items-center justify-center">
        <div
          className="flex h-36 w-36 items-center justify-center rounded-full border border-white/20"
          style={{
            background: `conic-gradient(#22d3ee 0% ${safe}%, rgba(255,255,255,0.14) ${safe}% 100%)`,
          }}
        >
          <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-[#0b0d0f]">
            <p className="text-3xl font-semibold text-white">{safe}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/55">/100</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LineChart({ title, data = [], color = "#22d3ee", yLabel = "" }) {
  const safe = Array.isArray(data) ? data : [];
  const width = 620;
  const height = 220;
  const padLeft = 24;
  const padTop = 20;
  const padBottom = 42;
  const plotW = width - padLeft * 2;
  const plotH = height - padTop - padBottom;
  const max = Math.max(1, ...safe.map((d) => num(d?.value, 0)));

  const points = safe.map((d, index) => {
    const x = padLeft + (safe.length <= 1 ? plotW / 2 : (index / (safe.length - 1)) * plotW);
    const y = padTop + (1 - num(d?.value, 0) / max) * plotH;
    return { x, y, label: String(d?.label || ""), value: num(d?.value, 0) };
  });
  const path = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length
    ? `${path} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`
    : "";
  const labelPoints =
    points.length <= 3
      ? points
      : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];

  return (
    <div className={PANEL}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{title}</h3>
        {yLabel ? <span className="text-xs text-white/50">{yLabel}</span> : null}
      </div>

      {points.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full">
          {Array.from({ length: 4 }).map((_, index) => {
            const y = padTop + (index / 3) * plotH;
            return (
              <line
                key={`grid-${index}`}
                x1={padLeft}
                y1={y}
                x2={padLeft + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
                strokeDasharray="4 6"
              />
            );
          })}

          <path d={area} fill={color} fillOpacity="0.12" />
          <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          {points.map((point, index) => (
            <circle key={`dot-${index}`} cx={point.x} cy={point.y} r="3.5" fill={color} />
          ))}
          {labelPoints.map((point, index) => (
            <text
              key={`label-${index}`}
              x={point.x}
              y={height - 12}
              textAnchor="middle"
              fill="rgba(255,255,255,0.65)"
              fontSize="10"
              fontFamily="var(--font-geist-mono)"
            >
              {point.label}
            </text>
          ))}
        </svg>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#0b0d0f] p-8 text-sm text-white/55">
          Not enough data to draw this trend.
        </div>
      )}
    </div>
  );
}

function BarChart({
  title,
  items = [],
  valueFormatter = exact,
  unit = "",
  colorClass = "from-cyan-400 to-orange-400",
}) {
  const safe = Array.isArray(items) ? items : [];
  const max = Math.max(1, ...safe.map((entry) => num(entry?.value, 0)));

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{title}</h3>
      {safe.length ? (
        <div className="mt-4 space-y-3">
          {safe.map((entry, index) => {
            const value = num(entry?.value, 0);
            const width = Math.max(3, (value / max) * 100);
            return (
              <div key={`${entry?.label || entry?.name || "item"}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/70">
                  <span className="truncate">{entry?.label || entry?.name || "Unknown"}</span>
                  <span>
                    {valueFormatter(value)}
                    {unit ? ` ${unit}` : ""}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${colorClass}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {entry?.hint ? <p className="mt-1 text-[11px] text-white/45">{entry.hint}</p> : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0d0f] p-8 text-sm text-white/55">
          No data available.
        </div>
      )}
    </div>
  );
}

function PieChart({ title, items = [] }) {
  const safe = (Array.isArray(items) ? items : []).filter((item) => num(item?.percent, 0) > 0);
  const stops = [];
  let acc = 0;
  safe.forEach((item) => {
    const value = num(item?.percent, 0);
    const next = Math.min(100, acc + value);
    stops.push(`${item.color || "#22d3ee"} ${acc}% ${next}%`);
    acc = next;
  });

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{title}</h3>
      {safe.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[190px,1fr] md:items-center">
          <div
            className="mx-auto h-44 w-44 rounded-full border border-white/15"
            style={{ background: `conic-gradient(${stops.join(", ")})` }}
          />
          <div className="space-y-2">
            {safe.map((item) => (
              <div
                key={`pie-${item?.name || item?.language}`}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d0f] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-white/80">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color || "#22d3ee" }}
                  />
                  {item?.name || item?.language || "Unknown"}
                </span>
                <span className="text-xs text-white/60">
                  {num(item?.percent, 0).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0d0f] p-8 text-sm text-white/55">
          No language distribution data available.
        </div>
      )}
    </div>
  );
}

function ContributionHeatmap({ days = [] }) {
  const map = new Map(
    (Array.isArray(days) ? days : []).map((entry) => [String(entry?.date || ""), Math.max(0, Math.floor(num(entry?.count, 0)))])
  );
  const values = [...map.values()].filter((value) => value > 0).sort((a, b) => a - b);
  const q1 = values[Math.floor((values.length - 1) * 0.25)] || 0;
  const q2 = values[Math.floor((values.length - 1) * 0.5)] || 0;
  const q3 = values[Math.floor((values.length - 1) * 0.75)] || 0;
  const level = (count) => {
    if (!count) return 0;
    if (!q1 || count <= q1) return 1;
    if (!q2 || count <= q2) return 2;
    if (!q3 || count <= q3) return 3;
    return 4;
  };

  const today = new Date();
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end.getTime() - 370 * 24 * 60 * 60 * 1000);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks = Array.from({ length: 53 }).map((_, weekIndex) =>
    Array.from({ length: 7 }).map((__, dayIndex) => {
      const date = new Date(start.getTime() + (weekIndex * 7 + dayIndex) * 24 * 60 * 60 * 1000);
      const iso = toIsoDay(date.toISOString());
      const count = map.get(iso) || 0;
      return {
        iso,
        count,
        hidden: date > end,
        color: HEATMAP_COLORS[level(count)],
      };
    })
  );

  return (
    <div className={CARD}>
      <SectionTitle
        eyebrow="Contribution Heatmap"
        title="Daily contribution intensity"
        description="A full-year view of your GitHub contribution density."
      />
      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[780px] gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="flex flex-col gap-[3px]">
              {week.map((cell, cellIndex) => (
                <div
                  key={`cell-${weekIndex}-${cellIndex}`}
                  className="h-[10px] w-[10px] rounded-[2px]"
                  style={{
                    backgroundColor: cell.hidden ? "rgba(255,255,255,0.04)" : cell.color,
                  }}
                  title={`${cell.iso}: ${cell.count} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-white/55">
          <span>Less</span>
          {HEATMAP_COLORS.map((color, index) => (
            <span key={`legend-${index}`} className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: color }} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default function ProfileAnalyticsDashboard({ data }) {
  const dashboard = data || {};
  const profile = dashboard?.profile || {};
  const overview = dashboard?.overview || {};
  const activityInsights = dashboard?.activityInsights || {};
  const languageInsights = dashboard?.languageInsights || {};
  const developerInsights = dashboard?.developerInsights || {};
  const structured = dashboard?.structuredAnalysis || {};

  const summary = structured?.developer_activity_summary || {};
  const productivity = structured?.productivity_metrics || {};
  const repoHealth = structured?.repository_health_insights || {};
  const codingPatterns = structured?.coding_pattern_analysis || {};
  const techProfile = structured?.technology_profile || {};
  const impact = structured?.open_source_impact || {};
  const collaboration = structured?.collaboration_behavior || {};
  const security = structured?.security_code_quality_indicators || {};
  const suggestions = Array.isArray(structured?.improvement_suggestions)
    ? structured.improvement_suggestions
    : [];
  const developerScore = structured?.developer_score || {};
  const [activeTab, setActiveTab] = useState("overview");

  const monthlyTrend = Array.isArray(activityInsights?.monthlyContributionTrends)
    ? activityInsights.monthlyContributionTrends
    : [];
  const weeklyTrend = Array.isArray(activityInsights?.weeklyCommitActivity)
    ? activityInsights.weeklyCommitActivity
    : [];
  const repoActivity = Array.isArray(activityInsights?.mostActiveRepositories)
    ? activityInsights.mostActiveRepositories
    : [];
  const languageDistribution = Array.isArray(languageInsights?.topLanguages)
    ? languageInsights.topLanguages
    : [];
  const languageActivity = Array.isArray(languageInsights?.activity)
    ? languageInsights.activity
    : [];

  const languageActivityTrend = languageActivity.map((entry) => ({
    label: entry?.label || "",
    value: Object.values(entry?.values || {}).reduce((sum, value) => sum + num(value, 0), 0),
  }));

  const repoHealthBars = (Array.isArray(repoHealth?.repositories) ? repoHealth.repositories : [])
    .slice(0, 8)
    .map((repo) => ({
      label: repo?.name || repo?.fullName || "Unknown",
      value: num(repo?.healthScore, 0),
      hint: `${startCase(repo?.healthStatus)} - ${startCase(repo?.maintenanceFrequency)} maintenance`,
    }));

  const repoActivityBars = repoActivity.slice(0, 8).map((repo) => ({
    label: repo?.name || repo?.fullName || "Unknown",
    value: num(repo?.value, 0),
    hint: repo?.fullName ? repo.fullName : "",
  }));

  const codingDayBars = (Array.isArray(codingPatterns?.mostProductiveDays)
    ? codingPatterns.mostProductiveDays
    : []
  ).map((entry) => ({
    label: entry?.day || "Unknown",
    value: num(entry?.commits, 0),
  }));

  const productiveTimeBars = (Array.isArray(developerInsights?.productiveTime?.buckets)
    ? developerInsights.productiveTime.buckets
    : []
  ).map((entry) => ({
    label: entry?.label || "Unknown",
    value: num(entry?.value, 0),
  }));

  const impactBars = [
    { label: "Stars", value: num(impact?.stars, 0) },
    { label: "Forks", value: num(impact?.forks, 0) },
    { label: "Pull Requests", value: num(impact?.pullRequests, 0) },
    { label: "Reviews", value: num(impact?.reviews, 0) },
    {
      label: "External Repos",
      value: num(impact?.externalRepositoryContributions, 0),
    },
  ];

  const collaborationBars = [
    { label: "Pull Requests", value: num(collaboration?.metrics?.pullRequests, 0) },
    { label: "Issues", value: num(collaboration?.metrics?.issues, 0) },
    { label: "Reviews", value: num(collaboration?.metrics?.reviews, 0) },
    {
      label: "External Repos",
      value: num(collaboration?.metrics?.externalRepositoriesCollaborated, 0),
    },
  ];

  const developerScoreComponents = Object.entries(developerScore?.componentScores || {}).map(
    ([key, value]) => ({
      label: startCase(key),
      value: num(value, 0),
    })
  );

  const dataWarnings = dashboard?.dataWarnings || {};
  const securityIndicators = security?.indicators || {};
  const repositoryHealthList = Array.isArray(repoHealth?.repositories) ? repoHealth.repositories : [];
  const repositoriesAnalyzed = repositoryHealthList.length;
  const repositoryDivisor = Math.max(1, repositoriesAnalyzed);
  const inactiveRepositoryCount = num(securityIndicators?.inactiveRepositories, 0);
  const abandonedProjectCount = num(securityIndicators?.abandonedProjects, 0);
  const issueBacklogCount = num(securityIndicators?.highIssueBacklogRepositories, 0);
  const unlicensedRepositoryCount = num(securityIndicators?.unlicensedRepositories, 0);
  const commitConsistencyScore = clamp(
    num(securityIndicators?.commitConsistencyScore, productivity?.consistencyScore),
    0,
    100
  );
  const averageRepositoryHealthScore = clamp(
    num(securityIndicators?.averageRepositoryHealthScore, repoHealth?.summary?.averageHealthScore),
    0,
    100
  );
  const hasCommitSignal = num(productivity?.totalCommits, 0) > 0;

  const qualityRiskScore = repositoriesAnalyzed
    ? clamp(
        Math.round(
          (inactiveRepositoryCount / repositoryDivisor) * 34 +
            (abandonedProjectCount / repositoryDivisor) * 28 +
            (issueBacklogCount / repositoryDivisor) * 18 +
            (unlicensedRepositoryCount / repositoryDivisor) * 10 +
            Math.max(0, 65 - commitConsistencyScore) * 0.18 +
            Math.max(0, 70 - averageRepositoryHealthScore) * 0.24
        ),
        0,
        100
      )
    : null;
  const qualityRiskLevel =
    qualityRiskScore === null
      ? "unknown"
      : qualityRiskScore >= 70
        ? "high"
        : qualityRiskScore >= 45
          ? "medium"
          : qualityRiskScore >= 20
            ? "low"
            : "minimal";
  const qualityRiskBarClass =
    qualityRiskLevel === "high"
      ? "from-red-500 to-rose-300"
      : qualityRiskLevel === "medium"
        ? "from-amber-500 to-yellow-300"
        : qualityRiskLevel === "low"
          ? "from-cyan-500 to-sky-300"
          : qualityRiskLevel === "minimal"
            ? "from-emerald-500 to-teal-300"
            : "from-zinc-500 to-zinc-300";

  const fallbackRisks = [];
  if (!Array.isArray(security?.risks) || !security.risks.length) {
    if (inactiveRepositoryCount > 0) {
      fallbackRisks.push({
        type: "inactive_repositories",
        severity: inactiveRepositoryCount >= 5 ? "high" : "medium",
        count: inactiveRepositoryCount,
        note: "Some repositories have no recent pushes in over 180 days.",
      });
    }
    if (abandonedProjectCount > 0) {
      fallbackRisks.push({
        type: "abandoned_projects",
        severity: abandonedProjectCount >= 3 ? "high" : "medium",
        count: abandonedProjectCount,
        note: "Stale repositories still have unresolved open issues.",
      });
    }
    if (issueBacklogCount > 0) {
      fallbackRisks.push({
        type: "issue_backlog",
        severity: issueBacklogCount >= 3 ? "high" : "medium",
        count: issueBacklogCount,
        note: "A backlog threshold was crossed in active repositories.",
      });
    }
    if (unlicensedRepositoryCount > 0) {
      fallbackRisks.push({
        type: "missing_license",
        severity: "low",
        count: unlicensedRepositoryCount,
        note: "One or more repositories are missing explicit licensing.",
      });
    }
    if (hasCommitSignal && commitConsistencyScore < 55) {
      fallbackRisks.push({
        type: "inconsistent_commits",
        severity: commitConsistencyScore < 40 ? "high" : "medium",
        count: 1,
        note: "Commit cadence is inconsistent, reducing delivery predictability.",
      });
    }
  }

  const qualityRisks = Array.isArray(security?.risks) && security.risks.length ? security.risks : fallbackRisks;
  const qualityAttentionRepos = repositoryHealthList
    .map((repo) => {
      const staleDays = daysSince(repo?.pushedAt || repo?.updatedAt);
      const openIssues = num(repo?.openIssues, 0);
      const healthScore = num(repo?.healthScore, 0);
      const reasons = [];
      let weight = 0;

      if (healthScore < 45) {
        reasons.push(`health ${exact(healthScore)}/100`);
        weight += 3;
      }
      if (staleDays !== null && staleDays > 180) {
        reasons.push(`${exact(staleDays)}d since push`);
        weight += staleDays > 365 ? 3 : 2;
      }
      if (openIssues >= 20) {
        reasons.push(`${exact(openIssues)} open issues`);
        weight += openIssues >= 40 ? 3 : 2;
      }
      if (!repo?.documentation?.hasLicense) {
        reasons.push("missing license");
        weight += 1;
      }

      return {
        name: repo?.name || repo?.fullName || "Repository",
        healthScore,
        reasons,
        weight,
      };
    })
    .filter((entry) => entry.weight > 0 && entry.reasons.length)
    .sort((a, b) => b.weight - a.weight || a.healthScore - b.healthScore)
    .slice(0, 5);

  const positiveQualitySignals = [
    repositoriesAnalyzed > 0 && inactiveRepositoryCount === 0
      ? "No inactive repositories older than 180 days were detected."
      : "",
    repositoriesAnalyzed > 0 && abandonedProjectCount === 0
      ? "No abandoned repositories with unresolved issues were detected."
      : "",
    repositoriesAnalyzed > 0 && issueBacklogCount === 0
      ? "Issue backlog stayed below the high-risk threshold."
      : "",
    repositoriesAnalyzed > 0 && unlicensedRepositoryCount === 0
      ? "All analyzed repositories include an explicit license."
      : "",
    hasCommitSignal && commitConsistencyScore >= 70
      ? `Commit consistency is stable at ${exact(commitConsistencyScore)}/100.`
      : "",
    repositoriesAnalyzed > 0 && averageRepositoryHealthScore >= 70
      ? `Average repository health is strong at ${exact(averageRepositoryHealthScore)}/100.`
      : "",
  ]
    .filter(Boolean)
    .slice(0, 4);

  const qualityCoverageNote = repositoriesAnalyzed
    ? `Analyzed ${exact(repositoriesAnalyzed)} repositories for quality and maintenance signals.`
    : dataWarnings?.repositoriesPartial
      ? "Repository metadata could not be loaded completely, so these indicators are partial."
      : "No owned repositories were found in this snapshot, so quality indicators are limited.";
  const qualityRiskSummary =
    qualityRiskLevel === "unknown"
      ? "The dashboard cannot compute a confident risk profile yet."
      : qualityRiskLevel === "high"
        ? "Multiple signals indicate elevated quality and maintenance risk."
        : qualityRiskLevel === "medium"
          ? "Quality risk is moderate and should be watched closely."
          : qualityRiskLevel === "low"
            ? "A few manageable quality risks were detected."
            : "Current security and quality indicators are healthy.";

  return (
    <div className="grid gap-6">
      <div className={CARD}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-white/15 bg-[#111418] p-2">
              {profile?.avatarUrl ? (
                <Image
                  src={profile.avatarUrl}
                  alt={`${profile?.login || "user"} avatar`}
                  width={84}
                  height={84}
                  className="rounded-xl object-cover"
                />
              ) : (
                <div className="h-[84px] w-[84px] rounded-xl bg-white/10" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-3xl font-semibold text-white">
                  {profile?.name || profile?.login || "Developer"}
                </h2>
                <Badge
                  label={startCase(summary?.activityLevel || "unknown")}
                  tone={toneFor(LEVEL_TONES, summary?.activityLevel)}
                />
              </div>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                {summary?.engagement ||
                  "No activity summary available yet. Run analytics after GitHub data sync."}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  label={`Score ${exact(developerScore?.developerPerformanceScore || 0)}`}
                  tone="border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
                />
                <Badge
                  label={startCase(developerScore?.performanceBand || "early_stage")}
                  tone="border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricTile label="Repositories" value={exact(overview.totalRepositories)} />
            <MetricTile label="Stars" value={compact(overview.totalStars)} />
            <MetricTile label="Forks" value={compact(overview.totalForks)} />
            <MetricTile label="Followers" value={compact(overview.followers)} />
            <MetricTile label="Following" value={compact(overview.following)} />
            <MetricTile label="Account Age" value={ageLabel(overview.accountAgeDays)} />
            <MetricTile
              label="Total Commits"
              value={compact(productivity.totalCommits || overview.totalCommits)}
              hint="Last 12 months"
            />
            <MetricTile
              label="Streak"
              value={`${exact(productivity.contributionStreak || overview.contributionStreak)}d`}
              hint={`Longest ${exact(productivity.longestStreak || overview.longestStreak)}d`}
            />
          </div>
        </div>
      </div>

      <div className={`${CARD} sticky top-3 z-10 backdrop-blur`}>
        <div className="flex flex-wrap gap-2">
          {DASHBOARD_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition ${
                  isActive
                    ? "border-cyan-300/60 bg-cyan-400/15 text-cyan-100"
                    : "border-white/15 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === "overview" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="1. Developer Activity Summary"
          title="Overall engagement snapshot"
          description="High-level activity, collaboration touchpoints, and weekly throughput."
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricTile label="Active Days" value={exact(summary?.highlights?.activeDays)} />
          <MetricTile
            label="Avg Commits/Week"
            value={num(summary?.highlights?.averageCommitsPerWeek, 0).toFixed(2)}
          />
          <MetricTile
            label="Collab Interactions"
            value={exact(summary?.highlights?.collaborationInteractions)}
          />
        </div>
      </div>
      )}

      {activeTab === "activity" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="2. Productivity Metrics"
          title="Frequency, consistency, and streak quality"
          description="Detects whether your output pattern is consistent, sporadic, or inactive."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <Gauge score={productivity?.consistencyScore} label="Commit Consistency" />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Productivity Classification
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={startCase(productivity?.consistencyLabel || "inactive")}
                tone={toneFor(LEVEL_TONES, productivity?.consistencyLabel)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricTile label="Active Day Ratio" value={pct(productivity?.activeDayRatio, 1)} />
              <MetricTile
                label="Avg Commits/Week"
                value={num(productivity?.averageCommitsPerWeek, 0).toFixed(2)}
              />
            </div>
          </div>
          <BarChart
            title="Most Active Repositories"
            items={repoActivityBars}
            unit="commits"
            colorClass="from-cyan-400 to-orange-400"
          />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <LineChart
            title="Weekly Commit Activity"
            data={weeklyTrend}
            color="#22d3ee"
            yLabel="Commits by weekday"
          />
          <LineChart
            title="Monthly Contribution Trends"
            data={monthlyTrend}
            color="#fb923c"
            yLabel="Commits per month"
          />
        </div>
      </div>
      )}

      {activeTab === "projects" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="3. Repository Health Insights"
          title="Maintenance quality across repositories"
          description="Health score combines freshness, issue pressure, maintenance frequency, and documentation signals."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <MetricTile
            label="Avg Health Score"
            value={exact(repoHealth?.summary?.averageHealthScore)}
          />
          <MetricTile
            label="Strong Repositories"
            value={exact(repoHealth?.summary?.strongRepositories)}
          />
          <MetricTile
            label="At-Risk Repositories"
            value={exact(repoHealth?.summary?.atRiskRepositories)}
          />
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <BarChart
            title="Repository Health Scores"
            items={repoHealthBars}
            unit="/100"
            colorClass="from-emerald-400 to-cyan-400"
          />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Repository Details
            </h3>
            <div className="mt-4 max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {(Array.isArray(repoHealth?.repositories) ? repoHealth.repositories : [])
                .slice(0, 12)
                .map((repo) => (
                  <div
                    key={`repo-health-${repo?.fullName || repo?.name}`}
                    className="rounded-xl border border-white/10 bg-[#0b0d0f] p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold text-white">{repo?.name}</p>
                      <Badge
                        label={`${exact(repo?.healthScore)}/100`}
                        tone={toneFor(
                          LEVEL_TONES,
                          repo?.healthScore >= 80
                            ? "high"
                            : repo?.healthScore >= 60
                              ? "moderate"
                              : "low"
                        )}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/55">
                      Issues: {exact(repo?.openIssues)} - Stars: {exact(repo?.stars)} - Forks:{" "}
                      {exact(repo?.forks)}
                    </p>
                    <p className="mt-1 text-xs text-white/45">
                      {startCase(repo?.maintenanceFrequency)} maintenance -{" "}
                      {startCase(repo?.issueResolutionIndicator)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "activity" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="4. Coding Pattern Analysis"
          title="Time, day, and trend behavior"
          description="Shows most active hours, productive weekdays, consistency, and trend direction."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <BarChart
            title={`Most Active Hours (${startCase(codingPatterns?.mostActiveHours?.dominantBucket)})`}
            items={productiveTimeBars}
            unit="events"
            colorClass="from-sky-400 to-teal-400"
          />
          <BarChart
            title="Most Productive Days"
            items={codingDayBars}
            unit="commits"
            colorClass="from-cyan-400 to-indigo-400"
          />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Contribution Trend Signal
            </h3>
            <div className="mt-4 space-y-3">
              <Badge
                label={startCase(codingPatterns?.contributionTrends?.direction || "stable")}
                tone={toneFor(LEVEL_TONES, codingPatterns?.contributionTrends?.direction)}
              />
              <MetricTile
                label="Delta"
                value={`${exact(codingPatterns?.contributionTrends?.deltaPercent || 0)}%`}
                hint="Second half vs first half of yearly window"
              />
              <MetricTile
                label="Peak Hour (UTC)"
                value={`${String(num(codingPatterns?.mostActiveHours?.peakHourUtc, 0)).padStart(2, "0")}:00`}
              />
              <MetricTile
                label="Consistency Label"
                value={startCase(codingPatterns?.codingConsistency?.label || "unknown")}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "projects" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="5. Technology Profile"
          title="Primary stack and specialization"
          description="Role inference is based on top language distribution and language activity."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <PieChart title="Language Distribution" items={languageDistribution} />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Specialization
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={techProfile?.specializationLabel || "Unknown"}
                tone="border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
              />
              <Badge
                label={`Confidence ${exact(techProfile?.confidence || 0)}%`}
                tone="border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
              />
            </div>
            <div className="mt-4 grid gap-2">
              {(Array.isArray(techProfile?.primaryLanguages) ? techProfile.primaryLanguages : []).map(
                (entry) => (
                  <div
                    key={`lang-${entry?.language}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d0f] px-3 py-2 text-sm"
                  >
                    <span className="text-white/80">{entry?.language || "Unknown"}</span>
                    <span className="text-xs text-white/60">{num(entry?.percent, 0).toFixed(1)}%</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <LineChart
            title="Language Activity Trend"
            data={languageActivityTrend}
            color="#34d399"
            yLabel="Weighted language events"
          />
        </div>
      </div>
      )}

      {activeTab === "impact" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="6. Open Source Impact"
          title="Community engagement and project reach"
          description="Impact score is computed from stars, forks, PRs, reviews, and external contribution breadth."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Gauge score={impact?.openSourceImpactScore} label="Open Source Impact Score" />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Impact Level
            </h3>
            <div className="mt-4">
              <Badge
                label={startCase(impact?.impactLevel || "limited")}
                tone={toneFor(LEVEL_TONES, impact?.impactLevel)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricTile label="Stars" value={compact(impact?.stars)} />
              <MetricTile label="Forks" value={compact(impact?.forks)} />
              <MetricTile label="PRs" value={compact(impact?.pullRequests)} />
              <MetricTile label="Reviews" value={compact(impact?.reviews)} />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <BarChart
            title="Impact Metrics Breakdown"
            items={impactBars}
            colorClass="from-amber-400 to-cyan-400"
          />
        </div>
      </div>
      )}

      {activeTab === "impact" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="7. Collaboration Behavior"
          title="How actively you work with others"
          description="PRs, issue participation, review activity, and external repository collaborations."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <BarChart
            title="Collaboration Channels"
            items={collaborationBars}
            unit="events"
            colorClass="from-indigo-400 to-cyan-400"
          />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Collaboration Summary
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge
                label={startCase(collaboration?.level || "solo_focused")}
                tone={toneFor(LEVEL_TONES, collaboration?.level)}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricTile
                label="Monthly Rate"
                value={num(collaboration?.metrics?.monthlyInteractionRate, 0).toFixed(1)}
                hint="interactions per month"
              />
              <MetricTile
                label="Total Interactions"
                value={exact(collaboration?.metrics?.totalInteractions)}
              />
              <MetricTile
                label="External Repos"
                value={exact(collaboration?.metrics?.externalRepositoriesCollaborated)}
              />
              <MetricTile
                label="Issues"
                value={exact(collaboration?.metrics?.issues)}
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "quality" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="8. Security & Code Quality Indicators"
          title="Potential risks and maintenance blind spots"
          description="Combines repository freshness, issue pressure, licensing hygiene, and consistency into a quality risk profile."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr,1fr]">
          <div className={PANEL}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Quality Risk Score</p>
                <p className="mt-2 text-4xl font-semibold text-white">
                  {qualityRiskScore === null ? "N/A" : exact(qualityRiskScore)}
                </p>
                <p className="mt-1 text-xs text-white/55">{qualityRiskSummary}</p>
              </div>
              <Badge
                label={startCase(qualityRiskLevel)}
                tone={toneFor(SEVERITY_TONES, qualityRiskLevel)}
              />
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div
                className={`h-2 rounded-full bg-gradient-to-r ${qualityRiskBarClass}`}
                style={{
                  width: `${Math.max(8, qualityRiskScore === null ? 8 : qualityRiskScore)}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs text-white/55">{qualityCoverageNote}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <MetricTile label="Inactive Repos" value={exact(inactiveRepositoryCount)} />
            <MetricTile label="Abandoned Projects" value={exact(abandonedProjectCount)} />
            <MetricTile label="High Issue Backlog" value={exact(issueBacklogCount)} />
            <MetricTile label="Missing License" value={exact(unlicensedRepositoryCount)} />
            <MetricTile label="Commit Consistency" value={`${exact(commitConsistencyScore)}/100`} />
            <MetricTile
              label="Avg Repo Health"
              value={`${exact(averageRepositoryHealthScore)}/100`}
            />
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Risk Signals
            </h3>
            <div className="mt-4 grid gap-3">
              {qualityRisks.length ? (
                qualityRisks.map((risk, index) => (
                  <div
                    key={`risk-${index}`}
                    className="rounded-2xl border border-white/10 bg-[#0b0d0f] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-white">{startCase(risk?.type)}</p>
                      <Badge
                        label={startCase(risk?.severity || "low")}
                        tone={toneFor(SEVERITY_TONES, risk?.severity)}
                      />
                    </div>
                    <p className="mt-2 text-sm text-white/65">{risk?.note}</p>
                    <p className="mt-1 text-xs text-white/50">
                      Affected count: {exact(risk?.count || 0)}
                    </p>
                  </div>
                ))
              ) : repositoriesAnalyzed === 0 ? (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                  Not enough repository data was available to produce concrete risk signals.
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  No major quality or security risks were detected in this analytics snapshot.
                </div>
              )}
            </div>
          </div>
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Repositories Needing Attention
            </h3>
            <div className="mt-4 grid gap-3">
              {qualityAttentionRepos.length ? (
                qualityAttentionRepos.map((repo, index) => (
                  <div
                    key={`quality-repo-${repo.name}-${index}`}
                    className="rounded-2xl border border-white/10 bg-[#0b0d0f] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-white">{repo.name}</p>
                      <Badge
                        label={`${exact(repo.healthScore)}/100`}
                        tone={toneFor(
                          LEVEL_TONES,
                          repo.healthScore >= 80
                            ? "high"
                            : repo.healthScore >= 60
                              ? "moderate"
                              : "low"
                        )}
                      />
                    </div>
                    <p className="mt-2 text-xs text-white/55">{repo.reasons.join(" - ")}</p>
                  </div>
                ))
              ) : positiveQualitySignals.length ? (
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                  <p className="font-semibold">Positive signals detected:</p>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-100">
                    {positiveQualitySignals.map((signal, index) => (
                      <li key={`quality-positive-${index}`}>- {signal}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0b0d0f] p-4 text-sm text-white/60">
                  Repository-specific quality flags are not available yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "quality" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="9. Improvement Suggestions"
          title="Actionable next steps"
          description="Prioritized recommendations to improve visibility, consistency, and project quality."
        />
        <div className="mt-6 grid gap-3">
          {suggestions.length ? (
            suggestions.map((suggestion, index) => (
              <div
                key={`suggestion-${index}`}
                className="rounded-2xl border border-white/10 bg-[#0f1115] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-white">{suggestion?.title || "Suggestion"}</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      label={startCase(suggestion?.priority || "low")}
                      tone={toneFor(PRIORITY_TONES, suggestion?.priority)}
                    />
                    {suggestion?.category ? (
                      <Badge
                        label={startCase(suggestion.category)}
                        tone="border-white/20 bg-white/10 text-white/70"
                      />
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 text-sm text-white/65">{suggestion?.action || ""}</p>
                {suggestion?.why ? (
                  <p className="mt-2 text-xs text-white/50">
                    <span className="font-semibold text-white/70">Why:</span> {suggestion.why}
                  </p>
                ) : null}
                {suggestion?.target ? (
                  <p className="mt-1 text-xs text-white/50">
                    <span className="font-semibold text-white/70">Target:</span> {suggestion.target}
                  </p>
                ) : null}
                {Array.isArray(suggestion?.nextSteps) && suggestion.nextSteps.length ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-[#0b0d0f] p-3">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">Next Steps</p>
                    <ul className="mt-2 space-y-1 text-xs text-white/65">
                      {suggestion.nextSteps.map((step, stepIndex) => (
                        <li key={`step-${index}-${stepIndex}`}>- {step}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-sm text-white/65">
              No suggestions available yet.
            </div>
          )}
        </div>
      </div>
      )}

      {activeTab === "overview" && (
      <div className={CARD}>
        <SectionTitle
          eyebrow="10. Developer Score"
          title="Composite performance assessment"
          description="Weighted score based on activity, consistency, collaboration, project quality, and impact."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <Gauge
            score={developerScore?.developerPerformanceScore}
            label="Developer Performance Score"
          />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Performance Band
            </h3>
            <div className="mt-4">
              <Badge
                label={startCase(developerScore?.performanceBand || "early_stage")}
                tone="border-cyan-300/40 bg-cyan-400/10 text-cyan-200"
              />
            </div>
            <div className="mt-4">
              <BarChart
                title="Score Components"
                items={developerScoreComponents}
                unit="/100"
                colorClass="from-cyan-400 to-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>
      )}

      {activeTab === "activity" && (
        <ContributionHeatmap days={dashboard?.contributionHeatmap?.days || []} />
      )}
    </div>
  );
}
