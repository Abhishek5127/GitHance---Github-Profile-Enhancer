"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const CARD = "analytics-card p-6";
const PANEL = "analytics-panel p-4";
const HEATMAP_COLORS = ["#e7f3e1", "#c9e7c4", "#97d892", "#60c06a", "#2f7d32"];
import {assets} from "@/app/assets/assets"

const PRIORITY_TONES = {
  high: "border-red-400/40 bg-red-500/10 text-red-200",
  medium: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  low: "border-cyan-300/40 bg-cyan-400/10 text-cyan-200",
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

export const DASHBOARD_TABS = [
  { id: "overview", label: "Overview",icon: assets.Analyze},
  { id: "activity", label: "Activity", icon: assets.Activity },
  { id: "maintainence", label: "Maintainence",icon: assets.Repair },
  { id: "impact", label: "Impact", icon: assets.Impact },
  { id: "security", label: "Security", icon: assets.Secure},
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

function formatPercent(value, digits = 1) {
  const parsed = num(value, 0);
  if (parsed > 0 && parsed < 0.1) return "<0.1%";
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
    <div className="analytics-panel px-4 py-3">
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
                stroke="var(--analytics-grid)"
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
              fill="var(--analytics-muted)"
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
  const base = Array.isArray(items) ? items : [];
  const totalValue = base.reduce((sum, item) => sum + Math.max(0, num(item?.value, 0)), 0);
  const safe = base
    .map((item) => ({
      ...item,
      computedPercent:
        totalValue > 0
          ? (Math.max(0, num(item?.value, 0)) / totalValue) * 100
          : Math.max(0, num(item?.percent, 0)),
    }))
    .filter((item) => item.computedPercent > 0);
  const stops = [];
  let acc = 0;
  safe.forEach((item) => {
    const value = num(item?.computedPercent, 0);
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
                  {formatPercent(item?.computedPercent, 1)}
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
                    backgroundColor: cell.hidden ? "var(--analytics-heatmap-empty)" : cell.color,
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

export default function ProfileAnalyticsDashboard({ data, activeTab = "overview" }) {
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
  const repositoryQualityAudit = structured?.repository_quality_audit || {};
  const suggestions = Array.isArray(structured?.improvement_suggestions)
    ? structured.improvement_suggestions
    : [];
  const developerScore = structured?.developer_score || {};
  const router = useRouter();

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
  const repositoryHealthList = Array.isArray(repoHealth?.repositories) ? repoHealth.repositories : [];
  const qualityAuditRepositories = Array.isArray(repositoryQualityAudit?.repositories)
    ? repositoryQualityAudit.repositories
    : [];
  const qualityAuditCategories = Array.isArray(repositoryQualityAudit?.categoryScores)
    ? repositoryQualityAudit.categoryScores
    : [];
  const qualityAuditDeductions = Array.isArray(repositoryQualityAudit?.deductionBreakdown)
    ? repositoryQualityAudit.deductionBreakdown
    : [];
  const qualityAuditBasis = Array.isArray(repositoryQualityAudit?.scoringBasis)
    ? repositoryQualityAudit.scoringBasis
    : [];
  const qualityAuditCoverage = repositoryQualityAudit?.scanCoverage || {};
  const qualityAuditCategoryBars = qualityAuditCategories.map((entry) => ({
    label: entry?.label || "Category",
    value: num(entry?.percent, 0),
    hint: `${num(entry?.score, 0).toFixed(1)}/${num(entry?.maxScore, 0).toFixed(1)} weighted points`,
  }));
  const qualityAuditScore = num(repositoryQualityAudit?.profileScore, 0);
  const qualityAuditGrade = String(repositoryQualityAudit?.profileGrade || "N/A");
  const qualityAuditAnalyzedRepos = Math.max(0, Math.floor(num(qualityAuditCoverage?.repositoriesAnalyzed, 0)));
  const qualityAuditRequestedRepos = Math.max(0, Math.floor(num(qualityAuditCoverage?.repositoriesRequested, 0)));
  const primaryLanguageEntries = Array.isArray(techProfile?.primaryLanguages)
    ? techProfile.primaryLanguages
    : [];
  const primaryLanguageTotalWeight = primaryLanguageEntries.reduce(
    (sum, entry) => sum + Math.max(0, num(entry?.weight, 0)),
    0
  );
  const securityAnalysisRepositories = (
    qualityAuditRepositories.length
      ? qualityAuditRepositories.slice(0, 12).map((repo) => ({
          name: repo?.name || "",
          fullName: repo?.fullName || repo?.name || "",
          visibility: repo?.private ? "Private" : "Public",
          score: repo?.score,
          grade: repo?.grade || "N/A",
          status: repo?.status || "complete",
          healthScore: 0,
          openIssues: num(repo?.openIssues, 0),
          maintenanceFrequency: repo?.status === "failed" ? "Unavailable" : "Assessed",
          pushedAt: repo?.pushedAt || repo?.updatedAt || "",
          missingComponents: Array.isArray(repo?.missingComponents) ? repo.missingComponents : [],
          configSignals: Array.isArray(repo?.detected?.configSignals) ? repo.detected.configSignals : [],
          dependencyManifests: Array.isArray(repo?.detected?.dependencyManifests)
            ? repo.detected.dependencyManifests
            : [],
          testingFrameworks: Array.isArray(repo?.detected?.testingFrameworks)
            ? repo.detected.testingFrameworks
            : [],
          ciPipelines: Array.isArray(repo?.detected?.ciPipelines) ? repo.detected.ciPipelines : [],
          scanError: repo?.error || "",
        }))
      : repositoryHealthList.length
        ? repositoryHealthList.slice(0, 12).map((repo) => ({
          name: repo?.name || "",
          fullName: repo?.fullName || repo?.name || "",
          visibility: repo?.private ? "Private" : "Public",
          score: null,
          grade: "N/A",
          status: "fallback",
          healthScore: num(repo?.healthScore, 0),
          openIssues: num(repo?.openIssues, 0),
          maintenanceFrequency: startCase(repo?.maintenanceFrequency || "unknown"),
          pushedAt: repo?.pushedAt || repo?.updatedAt || "",
          missingComponents: [],
          configSignals: [],
          dependencyManifests: [],
          testingFrameworks: [],
          ciPipelines: [],
          scanError: "",
        }))
        : repoActivity.slice(0, 12).map((repo) => {
            const fallbackFullName = String(repo?.fullName || repo?.name || "").trim();
            const fallbackName = String(repo?.name || fallbackFullName.split("/").pop() || "").trim();
            return {
              name: fallbackName,
              fullName: fallbackFullName || fallbackName,
              visibility: "Unknown",
              score: null,
              grade: "N/A",
              status: "fallback",
              healthScore: 0,
              openIssues: 0,
              maintenanceFrequency: "Unknown",
              pushedAt: "",
              missingComponents: [],
              configSignals: [],
              dependencyManifests: [],
              testingFrameworks: [],
              ciPipelines: [],
              scanError: "",
            };
          })
  ).filter((repo) => repo.name);

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
              {primaryLanguageEntries.map((entry) => {
                const computedPercent =
                  primaryLanguageTotalWeight > 0
                    ? (Math.max(0, num(entry?.weight, 0)) / primaryLanguageTotalWeight) * 100
                    : num(entry?.percent, 0);
                return (
                  <div
                    key={`lang-${entry?.language}`}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d0f] px-3 py-2 text-sm"
                  >
                    <span className="text-white/80">{entry?.language || "Unknown"}</span>
                    <span className="text-xs text-white/60">{formatPercent(computedPercent, 1)}</span>
                  </div>
                )
              })}
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
          eyebrow="8. Security Analysis"
          title="Profile quality score and repository security entry points"
          description="Score is based on documentation, configuration, structure, dependencies, testing, CI/CD, and community support. Click a repository to run deep security analysis."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
          <div className={PANEL}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/50">Profile Quality Score</p>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <p className="text-4xl font-semibold text-white">{exact(qualityAuditScore)}</p>
              <Badge
                label={qualityAuditGrade}
                tone="border-cyan-300/40 bg-cyan-500/10 text-cyan-200"
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MetricTile label="Repos Scanned" value={exact(qualityAuditAnalyzedRepos)} />
              <MetricTile label="Repos Considered" value={exact(qualityAuditRequestedRepos)} />
            </div>
            <p className="mt-3 text-xs text-white/55">
              Overall score deductions are based on missing documentation, weak structure signals,
              missing config/dependency metadata, limited tests, CI gaps, and community support gaps.
            </p>
          </div>
          <BarChart
            title="Quality Category Scores"
            items={qualityAuditCategoryBars}
            valueFormatter={(value) => `${num(value, 0).toFixed(0)}%`}
            colorClass="from-cyan-400 to-emerald-400"
          />
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Scoring Basis
            </h3>
            <div className="mt-3 grid gap-2">
              {qualityAuditBasis.length ? (
                qualityAuditBasis.map((basis) => (
                  <div
                    key={`basis-${basis?.key}`}
                    className="rounded-xl border border-white/10 bg-[#0b0d0f] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-white/75">
                        {basis?.label || "Category"}
                      </p>
                      <span className="text-[11px] text-white/45">
                        Weight {exact(basis?.weight)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/55">
                      {(Array.isArray(basis?.checks) ? basis.checks : []).join(" - ")}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-white/10 bg-[#0b0d0f] p-3 text-xs text-white/55">
                  Scoring basis unavailable for this snapshot.
                </div>
              )}
            </div>
          </div>

          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">
              Top Deduction Reasons
            </h3>
            <div className="mt-3 grid gap-2">
              {qualityAuditDeductions.length ? (
                qualityAuditDeductions.map((item) => (
                  <div
                    key={`deduction-${item?.key}`}
                    className="rounded-xl border border-white/10 bg-[#0b0d0f] p-3"
                  >
                    <p className="text-sm font-semibold text-white">{item?.label || "Deduction"}</p>
                    <p className="mt-1 text-xs text-white/55">
                      Points deducted: {num(item?.pointsDeducted, 0).toFixed(2)} - Repositories affected:{" "}
                      {exact(item?.repositoriesAffected)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                  No deduction reasons found in this scan window.
                </div>
              )}
            </div>
          </div>
        </div>

        {securityAnalysisRepositories.length ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {securityAnalysisRepositories.map((repo) => (
              <button
                key={`security-analysis-${repo.fullName}`}
                type="button"
                onClick={() => router.push(`/readme-analyze/${encodeURIComponent(repo.name)}`)}
                className="rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-[#12161c]"
              >
                <div className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-white">{repo.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      label={repo.visibility}
                      tone={
                        repo.visibility === "Private"
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                          : repo.visibility === "Public"
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                            : "border-white/20 bg-white/5 text-white/70"
                      }
                    />
                    {repo.score !== null ? (
                      <Badge
                        label={`${exact(repo.score)} (${repo.grade})`}
                        tone="border-cyan-300/40 bg-cyan-500/10 text-cyan-200"
                      />
                    ) : null}
                  </div>
                </div>

                <p className="mt-2 text-xs text-white/60">{repo.fullName}</p>
                {repo.scanError ? (
                  <p className="mt-3 text-xs text-amber-300">{repo.scanError}</p>
                ) : (
                  <>
                    <div className="mt-3 grid gap-1 text-xs text-white/55">
                      <p>
                        Config:{" "}
                        {repo.configSignals.length ? repo.configSignals.join(", ") : "No major config signal"}
                      </p>
                      <p>
                        Dependency:{" "}
                        {repo.dependencyManifests.length
                          ? repo.dependencyManifests.join(", ")
                          : "No supported manifest"}
                      </p>
                      <p>
                        Testing:{" "}
                        {repo.testingFrameworks.length
                          ? repo.testingFrameworks.join(", ")
                          : "No framework detected"}
                      </p>
                      <p>
                        CI/CD: {repo.ciPipelines.length ? repo.ciPipelines.join(", ") : "No pipeline detected"}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-white/55">
                      Missing essentials:{" "}
                      {repo.missingComponents.length
                        ? repo.missingComponents.slice(0, 3).join(", ")
                        : "None from scored checklist"}
                    </p>
                  </>
                )}
                <p className="mt-3 text-xs text-white/45">
                  Updated:{" "}
                  {repo.pushedAt ? new Date(repo.pushedAt).toLocaleDateString("en-US") : "Unknown"} - Open issues:{" "}
                  {exact(repo.openIssues)}
                </p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-red-700">
                  Open Security Analysis
                </p>
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1115] p-5 text-sm text-white/65">
            No repositories available yet for security analysis.
          </div>
        )}
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
              <div></div>
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




