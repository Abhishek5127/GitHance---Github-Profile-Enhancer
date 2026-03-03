"use client";

import React from "react";

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

const SEVERITY_STYLES = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-amber-400",
  low: "bg-lime-400",
};

const SEVERITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

function Gauge({ score, rating, ratingLabel }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, score));
  const dashOffset = circumference - (progress / 100) * circumference;

  const ringColor =
    score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : score >= 55 ? "#f97316" : "#ef4444";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Security Score</p>
      <div className="mt-4 flex items-center gap-6">
        <svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 60 60)"
          />
          <text
            x="60"
            y="57"
            textAnchor="middle"
            className="fill-white text-2xl font-semibold"
          >
            {score}
          </text>
          <text x="60" y="76" textAnchor="middle" className="fill-white/60 text-xs">
            /100
          </text>
        </svg>

        <div>
          <p className="text-3xl font-semibold text-white">{rating}</p>
          <p className="mt-1 text-sm text-white/60">{ratingLabel}</p>
        </div>
      </div>
    </div>
  );
}

function StatGrid({ totals, truncated, maxAnalyzedFiles }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Findings</p>
        <p className="mt-2 text-2xl font-semibold text-white">{totals.findings}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Risk Points</p>
        <p className="mt-2 text-2xl font-semibold text-white">{totals.riskPoints}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Files Analyzed</p>
        <p className="mt-2 text-2xl font-semibold text-white">{totals.filesAnalyzed}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Code Files</p>
        <p className="mt-2 text-2xl font-semibold text-white">{totals.totalCodeFiles}</p>
        {truncated ? (
          <p className="mt-2 text-xs text-amber-300">
            Large repo: capped at {maxAnalyzedFiles} files in this pass.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function SeverityChart({ severityCounts }) {
  const maxCount = Math.max(
    1,
    ...SEVERITY_ORDER.map((severity) => Number(severityCounts?.[severity] || 0))
  );

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">By Severity</p>
      <div className="mt-4 space-y-3">
        {SEVERITY_ORDER.map((severity) => {
          const count = Number(severityCounts?.[severity] || 0);
          const width = `${Math.max(6, Math.round((count / maxCount) * 100))}%`;

          return (
            <div key={severity}>
              <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                <span>{SEVERITY_LABELS[severity]}</span>
                <span>{count}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full ${SEVERITY_STYLES[severity]}`}
                  style={{ width }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryChart({ categoryBreakdown = [] }) {
  const topCategories = categoryBreakdown.slice(0, 7);
  const maxRisk = Math.max(1, ...topCategories.map((item) => item.riskPoints || 0));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Risk By Category</p>
      <div className="mt-4 space-y-3">
        {topCategories.length === 0 ? (
          <p className="text-sm text-white/60">No category risks detected.</p>
        ) : (
          topCategories.map((category) => (
            <div key={category.category}>
              <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                <span>{category.category}</span>
                <span>
                  {category.findings} findings / {category.riskPoints} pts
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-cyan-400"
                  style={{
                    width: `${Math.max(6, Math.round((category.riskPoints / maxRisk) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TopFilesChart({ topRiskFiles = [] }) {
  const maxRisk = Math.max(1, ...topRiskFiles.map((item) => item.riskPoints || 0));
  const rows = topRiskFiles.slice(0, 8);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Top Risky Files</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-white/60">No high-risk files detected.</p>
        ) : (
          rows.map((file) => (
            <div key={file.path}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-white/60">
                <span className="truncate">{file.path}</span>
                <span>
                  {file.riskPoints} pts ({file.findings})
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-orange-400"
                  style={{
                    width: `${Math.max(6, Math.round((file.riskPoints / maxRisk) * 100))}%`,
                  }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FindingsTable({ findings = [] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] text-white/50">
        Findings Preview
      </div>
      <div className="max-h-[360px] overflow-auto">
        {findings.length === 0 ? (
          <p className="p-4 text-sm text-white/60">No obvious vulnerability signals found in scanned files.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.12em] text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Severity</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Issue</th>
              </tr>
            </thead>
            <tbody>
              {findings.slice(0, 30).map((finding, index) => (
                <tr key={`${finding.filePath}-${finding.line}-${finding.ruleId}-${index}`} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white/80">{finding.severity}</td>
                  <td className="px-4 py-3 text-white/70">{finding.category}</td>
                  <td className="px-4 py-3 text-white/70">
                    <div className="max-w-[280px] truncate">{finding.filePath}</div>
                    <div className="text-xs text-white/45">Line {finding.line}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    <p>{finding.message}</p>
                    {finding.snippet ? (
                      <code className="mt-1 block max-w-[340px] truncate rounded bg-black/20 px-2 py-1 text-xs text-white/55">
                        {finding.snippet}
                      </code>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function SecurityOverview({
  loading = false,
  error = null,
  report = null,
  meta = null,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        Running repository security analysis...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (!report) return null;

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Repository Security</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Vulnerability and risk analytics</h2>
      </div>

      <StatGrid
        totals={report.totals}
        truncated={Boolean(meta?.truncated)}
        maxAnalyzedFiles={meta?.maxAnalyzedFiles}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Gauge score={report.score} rating={report.rating} ratingLabel={report.ratingLabel} />
        <SeverityChart severityCounts={report.severityCounts} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <CategoryChart categoryBreakdown={report.categoryBreakdown} />
        <TopFilesChart topRiskFiles={report.topRiskFiles} />
      </div>

      <FindingsTable findings={report.findings} />
    </section>
  );
}
