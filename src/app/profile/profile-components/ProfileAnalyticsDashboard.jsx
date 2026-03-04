"use client";

import Image from "next/image";

const CARD = "rounded-3xl border border-white/10 bg-white/5 p-6";
const PANEL = "rounded-2xl border border-white/10 bg-[#0f1115] p-4";
const HEAT = ["#1f2937", "#134e4a", "#0f766e", "#14b8a6", "#5eead4"];

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function compact(value) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Math.max(0, Math.floor(num(value, 0))));
}

function exact(value) {
  return new Intl.NumberFormat("en-US").format(Math.max(0, Math.floor(num(value, 0))));
}

function ageLabel(days) {
  const safe = Math.max(0, Math.floor(num(days, 0)));
  const years = Math.floor(safe / 365);
  const months = Math.floor((safe % 365) / 30);
  if (!years) return `${months}m`;
  if (!months) return `${years}y`;
  return `${years}y ${months}m`;
}

function Metric({ label, value, hint = "" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  );
}

function Section({ eyebrow, title, subtitle }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
      {subtitle ? <p className="mt-2 text-sm text-white/60">{subtitle}</p> : null}
    </div>
  );
}

function LineChart({ title, data = [], color = "#22d3ee" }) {
  const safe = Array.isArray(data) ? data : [];
  const width = 560;
  const height = 180;
  const p = 20;
  const plotW = width - p * 2;
  const plotH = height - 52;
  const max = Math.max(1, ...safe.map((d) => num(d?.value, 0)));

  const points = safe.map((d, index) => {
    const x = p + (safe.length <= 1 ? plotW / 2 : (index / (safe.length - 1)) * plotW);
    const y = p + (1 - num(d?.value, 0) / max) * plotH;
    return { x, y, label: String(d?.label || "") };
  });

  const line = points.map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x} ${pt.y}`).join(" ");

  return (
    <div className={PANEL}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{title}</h3>
      {points.length ? (
        <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full">
          {Array.from({ length: 4 }).map((_, i) => {
            const y = p + (i / 3) * plotH;
            return (
              <line
                key={`grid-${i}`}
                x1={p}
                y1={y}
                x2={p + plotW}
                y2={y}
                stroke="rgba(255,255,255,0.12)"
                strokeDasharray="4 6"
              />
            );
          })}
          <path d={line} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
          {points.map((pt, i) => (
            <circle key={`dot-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill={color} />
          ))}
          {[points[0], points[Math.floor(points.length / 2)], points[points.length - 1]]
            .filter(Boolean)
            .map((pt, i) => (
              <text
                key={`x-${i}`}
                x={pt.x}
                y={height - 12}
                textAnchor="middle"
                fill="rgba(255,255,255,0.65)"
                fontSize="10"
                fontFamily="var(--font-geist-mono)"
              >
                {pt.label}
              </text>
            ))}
        </svg>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#0b0d0f] p-8 text-sm text-white/55">
          No trend data available.
        </div>
      )}
    </div>
  );
}

function PieAndLegend({ languages = [] }) {
  const safe = (Array.isArray(languages) ? languages : []).slice(0, 6);
  const stops = [];
  let acc = 0;
  safe.forEach((entry) => {
    const next = acc + num(entry?.percent, 0);
    stops.push(`${entry.color} ${acc}% ${next}%`);
    acc = next;
  });

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Language Distribution</h3>
      {safe.length ? (
        <div className="mt-4 grid gap-4 md:grid-cols-[180px,1fr] md:items-center">
          <div
            className="mx-auto h-44 w-44 rounded-full border border-white/15"
            style={{ background: `conic-gradient(${stops.join(", ")})` }}
          />
          <div className="space-y-2">
            {safe.map((entry) => (
              <div
                key={entry.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0b0d0f] px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2 text-white/80">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}
                </span>
                <span className="text-xs text-white/60">{entry.percent}%</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0b0d0f] p-8 text-sm text-white/55">
          No language data found.
        </div>
      )}
    </div>
  );
}

function Bars({ title, items = [], unit = "commits", colorClass = "from-cyan-400 to-orange-400" }) {
  const safe = Array.isArray(items) ? items : [];
  const max = Math.max(1, ...safe.map((entry) => num(entry?.value, 0)));

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">{title}</h3>
      {safe.length ? (
        <div className="mt-4 space-y-3">
          {safe.map((entry, index) => {
            const value = num(entry?.value, 0);
            return (
              <div key={`${entry?.name || entry?.label || "item"}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/70">
                  <span className="truncate">{entry?.name || entry?.label || "Unknown"}</span>
                  <span>
                    {exact(value)} {unit}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className={`h-2 rounded-full bg-gradient-to-r ${colorClass}`}
                    style={{ width: `${Math.max(3, (value / max) * 100)}%` }}
                  />
                </div>
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

function Consistency({ score = 0 }) {
  const safe = Math.max(0, Math.min(100, Math.round(num(score, 0))));

  return (
    <div className={PANEL}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Commit Consistency</h3>
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
      <p className="mt-3 text-center text-xs text-white/55">Based on active-day ratio and weekly stability.</p>
    </div>
  );
}

function Heatmap({ days = [] }) {
  const map = new Map(
    (Array.isArray(days) ? days : []).map((entry) => [String(entry?.date || ""), Math.max(0, Math.floor(num(entry?.count, 0)))])
  );
  const values = [...map.values()].filter((v) => v > 0).sort((a, b) => a - b);
  const q1 = values[Math.floor((values.length - 1) * 0.25)] || 0;
  const q2 = values[Math.floor((values.length - 1) * 0.5)] || 0;
  const q3 = values[Math.floor((values.length - 1) * 0.75)] || 0;

  const resolve = (count) => {
    if (!count) return 0;
    if (!q1 || count <= q1) return 1;
    if (!q2 || count <= q2) return 2;
    if (!q3 || count <= q3) return 3;
    return 4;
  };

  const today = new Date();
  const utcToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(utcToday.getTime() - 370 * 24 * 60 * 60 * 1000);
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  const weeks = Array.from({ length: 53 }).map((_, week) =>
    Array.from({ length: 7 }).map((__, day) => {
      const date = new Date(start.getTime() + (week * 7 + day) * 24 * 60 * 60 * 1000);
      const iso = toIsoDay(date.toISOString());
      const count = map.get(iso) || 0;
      return {
        iso,
        count,
        color: HEAT[resolve(count)],
        hidden: date > utcToday,
      };
    })
  );

  return (
    <div className={CARD}>
      <Section
        eyebrow="Contribution Heatmap"
        title="Daily contribution intensity"
        subtitle="Last 12 months"
      />
      <div className="mt-5 overflow-x-auto">
        <div className="flex min-w-[760px] gap-[3px]">
          {weeks.map((week, weekIndex) => (
            <div key={`week-${weekIndex}`} className="flex flex-col gap-[3px]">
              {week.map((entry, dayIndex) => (
                <div
                  key={`day-${weekIndex}-${dayIndex}`}
                  className="h-[10px] w-[10px] rounded-[2px]"
                  style={{
                    backgroundColor: entry.hidden ? "rgba(255,255,255,0.04)" : entry.color,
                  }}
                  title={`${entry.iso}: ${entry.count} contributions`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-white/55">
          <span>Less</span>
          {HEAT.map((color, index) => (
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
  const languages = Array.isArray(dashboard?.languageInsights?.topLanguages)
    ? dashboard.languageInsights.topLanguages
    : [];
  const languageActivity = Array.isArray(dashboard?.languageInsights?.activity)
    ? dashboard.languageInsights.activity
    : [];
  const weekly = Array.isArray(dashboard?.activityInsights?.weeklyCommitActivity)
    ? dashboard.activityInsights.weeklyCommitActivity
    : [];
  const monthly = Array.isArray(dashboard?.activityInsights?.monthlyContributionTrends)
    ? dashboard.activityInsights.monthlyContributionTrends
    : [];
  const repos = Array.isArray(dashboard?.activityInsights?.mostActiveRepositories)
    ? dashboard.activityInsights.mostActiveRepositories
    : [];
  const creation = Array.isArray(dashboard?.developerInsights?.repositoryCreationTrends)
    ? dashboard.developerInsights.repositoryCreationTrends
    : [];
  const buckets = Array.isArray(dashboard?.developerInsights?.productiveTime?.buckets)
    ? dashboard.developerInsights.productiveTime.buckets
    : [];
  const collaboration = dashboard?.developerInsights?.collaborationMetrics || {};

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
                <h2 className="text-3xl font-semibold text-white">{profile?.name || profile?.login || "Developer"}</h2>
                <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/65">
                  Profile Dashboard
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm text-white/60">
                {profile?.bio || "No bio configured. Add one on GitHub for better profile clarity."}
              </p>
              {profile?.htmlUrl ? (
                <a
                  href={profile.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-full border border-orange-300/50 bg-orange-300/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-orange-200 transition hover:bg-orange-300/20"
                >
                  Open GitHub
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Repositories" value={exact(overview.totalRepositories)} />
            <Metric label="Stars" value={compact(overview.totalStars)} />
            <Metric label="Forks" value={compact(overview.totalForks)} />
            <Metric label="Followers" value={compact(overview.followers)} />
            <Metric label="Following" value={compact(overview.following)} />
            <Metric label="Account Age" value={ageLabel(overview.accountAgeDays)} />
            <Metric label="Total Commits" value={compact(overview.totalCommits)} hint="Last 12 months" />
            <Metric
              label="Streak"
              value={`${exact(overview.contributionStreak)}d`}
              hint={`Longest ${exact(overview.longestStreak)}d`}
            />
          </div>
        </div>
      </div>

      <div className={CARD}>
        <Section
          eyebrow="Language Insights"
          title="Top stacks and language momentum"
          subtitle="Includes top programming languages, percentage distribution, and language activity chart."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <PieAndLegend languages={languages} />
          <LineChart title="Language Activity Chart" data={languageActivity.map((month) => ({
            label: month?.label,
            value: Object.values(month?.values || {}).reduce((sum, value) => sum + num(value, 0), 0),
          }))} color="#34d399" />
        </div>
      </div>

      <div className={CARD}>
        <Section
          eyebrow="Activity Insights"
          title="Weekly and monthly contribution trends"
          subtitle="Includes weekly commit activity, monthly trends, most active repositories, and consistency score."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <LineChart title="Weekly Commit Activity" data={weekly} color="#22d3ee" />
          <LineChart title="Monthly Contribution Trends" data={monthly} color="#fb923c" />
          <Bars
            title="Most Active Repositories"
            items={repos.map((repo) => ({
              name: repo?.name || repo?.fullName || "Unknown",
              value: num(repo?.value, 0),
            }))}
          />
          <Consistency score={dashboard?.activityInsights?.commitConsistencyScore} />
        </div>
      </div>

      <div className={CARD}>
        <Section
          eyebrow="Developer Insights"
          title="Productive hours and collaboration"
          subtitle="Most productive time of day, repository creation trends, and PR/issue metrics."
        />
        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          <Bars
            title={`Most Productive Time: ${dashboard?.developerInsights?.productiveTime?.dominantBucket || "Unknown"}`}
            items={buckets.map((bucket) => ({ name: bucket?.label, value: bucket?.value }))}
            unit="events"
            colorClass="from-sky-400 to-emerald-400"
          />
          <Bars
            title="Repository Creation Trends"
            items={creation.map((entry) => ({ label: entry?.label, value: entry?.value }))}
            unit="repos"
            colorClass="from-emerald-400 to-cyan-400"
          />
          <div className={PANEL}>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-white/70">Collaboration Metrics</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label="PRs" value={exact(collaboration.pullRequests)} />
              <Metric label="Issues" value={exact(collaboration.issues)} />
              <Metric label="Reviews" value={exact(collaboration.reviews)} />
              <Metric label="Total" value={exact(collaboration.total)} />
            </div>
          </div>
        </div>
      </div>

      <Heatmap days={dashboard?.contributionHeatmap?.days || []} />
    </div>
  );
}
