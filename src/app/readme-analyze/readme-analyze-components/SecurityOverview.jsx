"use client";

import React, { useMemo, useState } from "react";

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "informational"];

const SEVERITY_LABELS = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  informational: "Informational",
};

const SEVERITY_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#84cc16",
  informational: "#38bdf8",
};

const SEVERITY_BADGE_CLASSES = {
  critical: "border-red-400/40 bg-red-500/15 text-red-200",
  high: "border-orange-400/40 bg-orange-500/15 text-orange-200",
  medium: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  low: "border-lime-400/40 bg-lime-500/15 text-lime-200",
  informational: "border-sky-400/40 bg-sky-500/15 text-sky-200",
};

const CONFIDENCE_BADGE_CLASSES = {
  high: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
  medium: "border-indigo-400/40 bg-indigo-500/15 text-indigo-200",
  low: "border-slate-400/40 bg-slate-500/15 text-slate-200",
};

function severityValue(severity) {
  if (severity === "critical") return 4;
  if (severity === "high") return 3;
  if (severity === "medium") return 2;
  if (severity === "low") return 1;
  return 0;
}

function polarToCartesian(cx, cy, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

function getScoreColor(score) {
  if (score >= 85) return "#22c55e";
  if (score >= 70) return "#eab308";
  if (score >= 55) return "#f97316";
  return "#ef4444";
}

function DonutChart({ title, data, total, centerLabel, centerSubLabel }) {
  const safeTotal = Math.max(0, Number(total || 0));
  const displayTotal = safeTotal === 0 ? 1 : safeTotal;
  const radius = 56;
  const strokeWidth = 18;
  const cx = 90;
  const cy = 90;

  const segments = data
    .filter((item) => Number(item.value || 0) > 0)
    .reduce(
      (acc, item) => {
        const value = Number(item.value || 0);
        const angle = Math.max(0, (value / displayTotal) * 360);
        const startAngle = acc.runningAngle;
        const endAngle = acc.runningAngle + (angle >= 360 ? 359.99 : angle);
        const segment = {
          ...item,
          startAngle,
          endAngle,
          percentage: safeTotal > 0 ? Math.round((value / safeTotal) * 100) : 0,
        };

        return {
          runningAngle: acc.runningAngle + angle,
          segments: [...acc.segments, segment],
        };
      },
      { runningAngle: 0, segments: [] }
    )
    .segments;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">{title}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <div className="mx-auto w-fit">
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#1f2937"
              strokeWidth={strokeWidth}
            />
            {segments.map((segment) => (
              <path
                key={`${segment.label}-${segment.value}`}
                d={describeArc(cx, cy, radius, segment.startAngle, segment.endAngle)}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            ))}
            <text x={cx} y={85} textAnchor="middle" className="fill-white text-2xl font-semibold">
              {centerLabel}
            </text>
            <text x={cx} y={103} textAnchor="middle" className="fill-white/60 text-xs">
              {centerSubLabel}
            </text>
          </svg>
        </div>

        <div className="space-y-2">
          {segments.length === 0 ? (
            <p className="text-sm text-white/60">No data available for this chart.</p>
          ) : (
            segments.map((segment) => (
              <div key={segment.label} className="rounded-lg border border-white/10 bg-black/20 p-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2 text-white/80">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span>{segment.label}</span>
                  </div>
                  <div className="text-white/60">
                    {segment.value} ({segment.percentage}%)
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score, rating, ratingLabel }) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.max(0, Math.min(100, Number(score || 0)));
  const dashOffset = circumference - (clampedScore / 100) * circumference;
  const scoreColor = getScoreColor(clampedScore);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Security Rating</p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <svg width="132" height="132" viewBox="0 0 132 132" className="shrink-0">
          <circle cx="66" cy="66" r={radius} fill="none" stroke="#1f2937" strokeWidth="11" />
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            transform="rotate(-90 66 66)"
          />
          <text x="66" y="62" textAnchor="middle" className="fill-white text-3xl font-semibold">
            {clampedScore}
          </text>
          <text x="66" y="82" textAnchor="middle" className="fill-white/60 text-xs">
            score / 100
          </text>
        </svg>

        <div>
          <p className="text-4xl font-semibold text-white">{rating}</p>
          <p className="mt-1 text-sm text-white/60">{ratingLabel}</p>
          <p className="mt-3 max-w-sm text-sm text-white/70">
            Rating is computed from weighted risk points by severity and normalized by analyzed file count.
          </p>
        </div>
      </div>
    </div>
  );
}

function SummaryCards({ report, meta }) {
  const totals = report?.totals || {};
  const coverage = report?.coverage || {};
  const summary = report?.summary || {};
  const suppressedSummary = report?.suppressed_summary || {};

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Issue Types</p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {summary.total_issue_types ?? totals.findings ?? 0}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Total Instances</p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {summary.total_instances ?? totals.findings ?? 0}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Files Analyzed</p>
        <p className="mt-2 text-3xl font-semibold text-white">{totals.filesAnalyzed || 0}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Code Files</p>
        <p className="mt-2 text-3xl font-semibold text-white">{totals.totalCodeFiles || 0}</p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Coverage</p>
        <p className="mt-2 text-3xl font-semibold text-white">{coverage.analyzedPercent || 0}%</p>
        {meta?.truncated ? (
          <p className="mt-2 text-xs text-amber-300">
            Repository is large. Analysis capped at {meta.maxAnalyzedFiles} files.
          </p>
        ) : null}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Security Score</p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {summary.security_score ?? report?.security_score ?? report?.score ?? 100}
        </p>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Suppressed</p>
        <p className="mt-2 text-3xl font-semibold text-white">
          {suppressedSummary.instances ?? totals.suppressedFindings ?? 0}
        </p>
      </div>
    </div>
  );
}

function ScopeAndClassification({ report }) {
  const classification = report?.repository_classification || {};
  const developerRisk = report?.developer_risk || {};
  const dependencyRisk = report?.dependency_risk || {};
  const primaryLanguages = Array.isArray(classification.primary_languages)
    ? classification.primary_languages
    : [];
  const buildTools = Array.isArray(classification.build_tools) ? classification.build_tools : [];
  const packageManagers = Array.isArray(classification.package_managers)
    ? classification.package_managers
    : [];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Risk Scope</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-cyan-100/80">Developer Risk</p>
            <p className="mt-2 text-lg font-semibold text-white">
              {developerRisk.issues_found ?? report.issues_found ?? 0} issues
            </p>
            <p className="text-sm text-white/70">
              score: {developerRisk.security_score ?? report.security_score ?? 100}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-white/55">Dependency Risk</p>
            <p className="mt-2 text-lg font-semibold text-white/90">
              {dependencyRisk.status === "excluded" ? "Excluded" : "N/A"}
            </p>
            <p className="text-sm text-white/60">
              {dependencyRisk.note || "Dependency code is not analyzed in this module."}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Repository Classification</p>
        <div className="mt-3 space-y-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/45">Primary Languages</p>
            <p className="mt-1 text-white/80">
              {primaryLanguages.length > 0 ? primaryLanguages.join(", ") : "Unknown"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/45">Build Tools</p>
            <p className="mt-1 text-white/80">{buildTools.length > 0 ? buildTools.join(", ") : "Not detected"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-white/45">Package Managers</p>
            <p className="mt-1 text-white/80">
              {packageManagers.length > 0 ? packageManagers.join(", ") : "Not detected"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExclusionSummary({ summary = {} }) {
  const entries = Object.entries(summary)
    .filter(([, value]) => Number(value || 0) > 0)
    .sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Excluded / Skipped Files</p>
      <p className="mt-2 text-sm text-white/65">
        Dependency, vendored, generated, binary, and oversized files are removed before developer risk scoring.
      </p>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-white/60">No files were skipped by exclusion filters.</p>
        ) : (
          entries.map(([reason, count]) => (
            <div
              key={reason}
              className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <span className="text-white/75">{reason.replaceAll("_", " ")}</span>
              <span className="text-white">{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CoverageBar({ report }) {
  const coverage = report?.coverage || {};
  const analyzedFiles = Number(coverage.analyzedFiles || 0);
  const skippedFiles = Number(coverage.skippedFiles || 0);
  const total = Math.max(1, analyzedFiles + skippedFiles);
  const analyzedPercent = Math.round((analyzedFiles / total) * 100);
  const skippedPercent = 100 - analyzedPercent;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Scan Coverage</p>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
        <div className="h-full bg-cyan-400" style={{ width: `${analyzedPercent}%` }} />
      </div>
      <div className="mt-3 grid gap-2 text-sm text-white/70 sm:grid-cols-2">
        <div>Analyzed files: {analyzedFiles}</div>
        <div>Skipped files: {skippedFiles}</div>
        <div>Analyzed coverage: {analyzedPercent}%</div>
        <div>Skipped share: {skippedPercent}%</div>
      </div>
    </div>
  );
}

function TopRiskFilesChart({ files = [] }) {
  const rows = files.slice(0, 10);
  const maxRisk = Math.max(1, ...rows.map((item) => Number(item.riskPoints || 0)));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Top Risky Files</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm text-white/60">No risky files detected in analyzed code.</p>
        ) : (
          rows.map((item) => {
            const width = Math.max(8, Math.round((item.riskPoints / maxRisk) * 100));
            return (
              <div key={item.path}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="truncate">{item.path}</span>
                  <span>
                    {item.riskPoints} pts / {item.findings} findings
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-orange-400" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function RuleFrequencyChart({ rules = [] }) {
  const topRules = rules.slice(0, 8);
  const maxCount = Math.max(1, ...topRules.map((item) => Number(item.findings || 0)));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/50">Top Issue Types</p>
      <div className="mt-4 space-y-3">
        {topRules.length === 0 ? (
          <p className="text-sm text-white/60">No issue types to display.</p>
        ) : (
          topRules.map((rule) => {
            const width = Math.max(8, Math.round((rule.findings / maxCount) * 100));
            return (
              <div key={rule.ruleId}>
                <div className="mb-1 flex items-center justify-between gap-2 text-xs text-white/60">
                  <span className="truncate">{rule.title}</span>
                  <span>{rule.findings}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full bg-fuchsia-400" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function InsightsPanel({ insights = [] }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">What This Means</p>
      <div className="mt-3 space-y-2">
        {insights.length === 0 ? (
          <p className="text-sm text-white/70">No additional insights generated.</p>
        ) : (
          insights.map((insight, index) => (
            <p key={`${index}-${insight.slice(0, 24)}`} className="text-sm text-white/80">
              {index + 1}. {insight}
            </p>
          ))
        )}
      </div>
    </div>
  );
}

function CleanReportPanel({ report }) {
  const issuesFound = Number(report?.issues_found || 0);
  const cleanReport = report?.clean_report;
  if (issuesFound !== 0 || !cleanReport) return null;

  const coverage =
    cleanReport?.security_coverage_summary || report?.security_coverage_summary || {};
  const positiveSignals = Array.isArray(cleanReport?.positive_security_signals)
    ? cleanReport.positive_security_signals
    : [];
  const hardening = Array.isArray(cleanReport?.hardening_recommendations)
    ? cleanReport.hardening_recommendations
    : [];

  const coverageRows = [
    ["HTTP Routes Analyzed", coverage.http_routes_analyzed || 0],
    ["Sinks Reviewed", coverage.sinks_reviewed || 0],
    ["Files Scanned", coverage.files_scanned || 0],
    ["Secret Patterns Checked", coverage.secret_patterns_checked || 0],
    [
      "Auth-Related Files Inspected",
      coverage.authentication_related_files_inspected || 0,
    ],
  ];

  return (
    <section className="space-y-4 rounded-2xl border border-emerald-400/25 bg-emerald-500/5 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">Clean Security Report</p>
        <h3 className="mt-1 text-xl font-semibold text-white">
          {cleanReport.message ||
            "No exploitable vulnerabilities were detected in developer-written code."}
        </h3>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {coverageRows.map(([label, value]) => (
          <div
            key={label}
            className="rounded-lg border border-white/10 bg-black/20 px-3 py-2"
          >
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">{label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Positive Security Signals
          </p>
          <div className="mt-2 space-y-1.5">
            {positiveSignals.map((signal) => (
              <p key={signal} className="text-sm text-white/80">
                • {signal}
              </p>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">
            Hardening Recommendations
          </p>
          <div className="mt-2 space-y-1.5">
            {hardening.map((item) => (
              <p key={item} className="text-sm text-white/80">
                • {item}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FindingCard({ finding }) {
  const severityValueRaw = String(finding.severity || "low").toLowerCase();
  const confidenceValueRaw = String(finding.confidence || "low").toLowerCase();
  const severityClass = SEVERITY_BADGE_CLASSES[severityValueRaw] || SEVERITY_BADGE_CLASSES.low;
  const confidenceClass =
    CONFIDENCE_BADGE_CLASSES[confidenceValueRaw] || CONFIDENCE_BADGE_CLASSES.low;
  const instances = Array.isArray(finding.instances) ? finding.instances : [];
  const previewInstances = instances.slice(0, 4);
  const moreCount = Math.max(0, instances.length - previewInstances.length);

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${severityClass}`}>
          {finding.severity || SEVERITY_LABELS[severityValueRaw] || "Low"}
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${confidenceClass}`}>
          confidence: {finding.confidence || "Low"}
        </span>
        {typeof finding.confidence_score === "number" ? (
          <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/75">
            confidence score: {finding.confidence_score}
          </span>
        ) : null}
        {finding.suppressed ? (
          <span className="rounded-full border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
            suppressed
          </span>
        ) : null}
        {finding.cwe ? (
          <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/70">
            {finding.cwe}
          </span>
        ) : null}
        <span className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 text-xs text-white/70">
          {instances.length} instances
        </span>
      </div>

      <h4 className="mt-3 text-base font-semibold text-white">{finding.category}</h4>
      <p className="mt-1 text-xs text-white/55">Root pattern: {finding.root_cause_pattern}</p>
      <div className="mt-2 grid gap-1 text-xs text-white/65 sm:grid-cols-2">
        <p>Execution context: {finding.execution_context || "UNKNOWN"}</p>
        <p>Attack surface: {finding.attack_surface || "UNKNOWN"}</p>
        <p>Input source rank: {finding.input_source_rank || "UNKNOWN"}</p>
        <p>Exploitability: {finding.exploitability || "Unlikely"}</p>
        <p>Detection confidence: {finding.detection_confidence ?? "N/A"}</p>
        <p>Flow confidence: {finding.flow_confidence ?? "N/A"}</p>
        <p>Exploitability confidence: {finding.exploitability_confidence ?? "N/A"}</p>
        <p>Overall confidence: {finding.overall_confidence ?? finding.confidence_score ?? "N/A"}</p>
      </div>
      {finding.reasoning ? (
        <p className="mt-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/75">
          {finding.reasoning}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Why This Matters</p>
          <p className="mt-1.5 text-sm text-white/80">
            {finding.why_this_matters || finding.description}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Realistic Risk</p>
          <p className="mt-1.5 text-sm text-white/80">
            {finding.realistic_risk_assessment || finding.impact || "Potential security impact if exploitable."}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Developer Action</p>
          <p className="mt-1.5 text-sm text-white/80">
            {finding.developer_action || finding.recommendation || "Apply secure coding best practices."}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Affected Files (Preview)</p>
        {previewInstances.map((instance, index) => (
          <div key={`${instance.file}-${instance.line_start}-${index}`} className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-xs text-white/80">
              {instance.file}:{instance.line_start}
              {instance.line_end && instance.line_end !== instance.line_start
                ? `-${instance.line_end}`
                : ""}
            </p>
            <div className="mt-2 grid gap-1 text-[11px] text-white/65 sm:grid-cols-2">
              <p className="truncate">
                API: {instance.fully_qualified_function || "unresolved"}
              </p>
              <p>Module: {instance.resolved_module_source || "unresolved"}</p>
              <p>Import verified: {instance.import_verified ? "yes" : "no"}</p>
              <p>
                Source-to-sink:{" "}
                {instance.source_to_sink_detected
                  ? "confirmed"
                  : instance.flow_status || "not confirmed"}
              </p>
              <p>Execution context: {instance.execution_context || "UNKNOWN"}</p>
              <p>Attack surface: {instance.attack_surface || "UNKNOWN"}</p>
              <p>Input source rank: {instance.input_source_rank || "UNKNOWN"}</p>
              <p>Exploitability: {instance.exploitability || "Unlikely"}</p>
              <p>Confidence score: {instance.confidence_score ?? "N/A"}</p>
              <p>Detection confidence: {instance.detection_confidence ?? "N/A"}</p>
              <p>Flow confidence: {instance.flow_confidence ?? "N/A"}</p>
              <p>Exploitability confidence: {instance.exploitability_confidence ?? "N/A"}</p>
              <p>Overall confidence: {instance.overall_confidence ?? instance.confidence_score ?? "N/A"}</p>
            </div>
            {instance.confidence_reason ? (
              <p className="mt-2 text-xs text-amber-200/80">
                Confidence note: {instance.confidence_reason}
              </p>
            ) : null}
            {instance.needs_manual_review ? (
              <p className="mt-2 text-xs text-amber-300/90">Manual Review Suggested</p>
            ) : null}
            <code className="mt-2 block max-w-full overflow-auto whitespace-pre-wrap break-all text-xs text-cyan-200/90">
              {instance.evidence}
            </code>
            {instance.flow_hint ? (
              <p className="mt-2 text-xs text-white/65">Flow hint: {instance.flow_hint}</p>
            ) : null}
            <pre className="mt-2 max-w-full overflow-auto whitespace-pre-wrap text-xs text-white/80">
              {instance.code_block}
            </pre>
          </div>
        ))}
        {moreCount > 0 ? (
          <p className="text-xs text-white/55">+ {moreCount} more instances in this issue type.</p>
        ) : null}
      </div>
    </article>
  );
}

function FindingsPreview({ groupedIssues = [] }) {
  const [visibleCount, setVisibleCount] = useState(8);
  const sortedFindings = useMemo(
    () =>
      [...groupedIssues].sort((a, b) => {
        const rankDiff =
          severityValue(String(b.severity || "").toLowerCase()) -
          severityValue(String(a.severity || "").toLowerCase());
        if (rankDiff !== 0) return rankDiff;
        return (b.instances?.length || 0) - (a.instances?.length || 0);
      }),
    [groupedIssues]
  );

  const visibleFindings = sortedFindings.slice(0, visibleCount);
  const canShowMore = visibleCount < sortedFindings.length;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">Detailed Finding Preview</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Grouped issue types with affected instances</h3>
        </div>
        <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/70">
          {sortedFindings.length} issue types
        </span>
      </div>

      {sortedFindings.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
          No findings in this scan window.
        </div>
      ) : (
        <div className="space-y-3">
          {visibleFindings.map((finding, index) => (
            <FindingCard
              key={`${finding.cwe}-${finding.category}-${finding.root_cause_pattern}-${index}`}
              finding={finding}
            />
          ))}
          {canShowMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 8)}
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:bg-white/10"
            >
              Load 8 more findings
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}

function SuppressedFindingsSection({ suppressedIssues = [] }) {
  const [expanded, setExpanded] = useState(false);
  const suppressed = Array.isArray(suppressedIssues) ? suppressedIssues : [];
  if (suppressed.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Suppressed Noise</p>
            <p className="mt-1 text-sm text-white/80">
              {suppressed.length} low-value issue types were suppressed by the Precision & Trust layer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className="rounded-lg border border-amber-300/30 bg-black/20 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-black/35"
          >
            {expanded ? "Hide Suppressed Issues" : "Show Suppressed Issues"}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3">
          {suppressed.map((finding, index) => (
            <FindingCard
              key={`suppressed-${finding.cwe}-${finding.category}-${finding.root_cause_pattern}-${index}`}
              finding={finding}
            />
          ))}
        </div>
      ) : null}
    </section>
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

  const severityData = SEVERITY_ORDER.map((severity) => ({
    label: SEVERITY_LABELS[severity],
    value: Number(report?.severityCounts?.[severity] || 0),
    color: SEVERITY_COLORS[severity],
  }));

  const categoryData = (report?.categoryBreakdown || []).slice(0, 6).map((item, index) => {
    const palette = ["#22d3ee", "#38bdf8", "#818cf8", "#a78bfa", "#f472b6", "#fb7185"];
    return {
      label: item.category,
      value: Number(item.riskPoints || 0),
      color: palette[index % palette.length],
    };
  });

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-white/10 bg-[linear-gradient(130deg,rgba(14,20,32,0.95),rgba(16,24,30,0.9),rgba(28,16,36,0.88))] p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Repository Security Lab</p>
        <h2 className="mt-3 text-3xl font-semibold text-white">Detailed vulnerability analytics</h2>
        <p className="mt-2 max-w-3xl text-sm text-white/70">
          This report explains what was detected, why it matters, and what to change next.
        </p>
      </div>

      <SummaryCards report={report} meta={meta} />
      <CleanReportPanel report={report} />
      <ScopeAndClassification report={report} />
      <ExclusionSummary summary={report?.exclusion_summary || {}} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <ScoreGauge
          score={report.score}
          rating={report.rating}
          ratingLabel={report.ratingLabel}
        />
        <CoverageBar report={report} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DonutChart
          title="Severity Distribution"
          data={severityData}
          total={report?.totals?.findings || 0}
          centerLabel={report?.totals?.findings || 0}
          centerSubLabel="total findings"
        />
        <DonutChart
          title="Category Risk Share"
          data={categoryData}
          total={(categoryData || []).reduce((sum, item) => sum + item.value, 0)}
          centerLabel={(categoryData || []).length}
          centerSubLabel="categories"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopRiskFilesChart files={report?.topRiskFiles || []} />
        <RuleFrequencyChart rules={report?.ruleBreakdown || []} />
      </div>

      <InsightsPanel insights={report?.insights || []} />

      <FindingsPreview groupedIssues={report?.grouped_issues || report?.findings || []} />
      <SuppressedFindingsSection suppressedIssues={report?.suppressed_issues || []} />
    </section>
  );
}
