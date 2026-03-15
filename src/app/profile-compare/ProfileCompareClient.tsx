"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  FINAL_SCORE_WEIGHTS,
  SCORE_DIMENSIONS,
  SCORE_LABELS,
  type ComparedProfile,
  type ComparedRepository,
  type ProfileComparisonResult,
  type ScoreDimensionKey,
} from "./profileCompareService";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(Number(value || 0)));
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value || 0));
}

function formatDecimal(value: number) {
  return Number(value || 0).toFixed(1);
}

function formatRepoSize(value: number) {
  return value >= 1024 ? `${(value / 1024).toFixed(1)} MB` : `${value.toFixed(0)} KB`;
}

function formatGeneratedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";

  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function displayHandle(profile: ComparedProfile) {
  return `@${profile.basic.username}`;
}

function normalizeUsernameInput(value: string) {
  return String(value || "").trim().toLowerCase();
}

async function requestProfileComparison(
  leftUsernameInput: string,
  rightUsernameInput: string
): Promise<ProfileComparisonResult> {
  const leftUsername = normalizeUsernameInput(leftUsernameInput);
  const rightUsername = normalizeUsernameInput(rightUsernameInput);

  if (!leftUsername || !rightUsername) {
    throw new Error("Both GitHub usernames are required.");
  }

  if (leftUsername === rightUsername) {
    throw new Error("Enter two different GitHub usernames to compare.");
  }

  const response = await fetch("/api/profile-compare", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      leftUsername,
      rightUsername,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.comparison) {
    throw new Error(
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error || "Unable to compare these GitHub profiles right now.")
        : "Unable to compare these GitHub profiles right now."
    );
  }

  return payload.comparison as ProfileComparisonResult;
}

function winnerLabel(winner: string, left: ComparedProfile, right: ComparedProfile) {
  if (winner === "Tie") return "Tie";
  if (winner === left.basic.username) return displayHandle(left);
  if (winner === right.basic.username) return displayHandle(right);
  return "Tie";
}

function compareNumbers(leftValue: number, rightValue: number) {
  if (leftValue === rightValue) return "tie";
  return leftValue > rightValue ? "left" : "right";
}

function scoreBarWidth(value: number) {
  return `${Math.max(6, Math.min(100, Number(value || 0)))}%`;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[30px] border border-white/10 bg-white/[0.045] shadow-[0_30px_80px_rgba(0,0,0,0.35)] ${className}`}>
      {children}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/40">{eyebrow}</p>
      <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-white/60">{description}</p>
    </div>
  );
}

function Badge({
  label,
  tone = "slate",
}: {
  label: string;
  tone?: "slate" | "cyan" | "amber" | "emerald";
}) {
  const toneClasses = {
    slate: "border-white/10 bg-white/[0.05] text-white/70",
    cyan: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
    amber: "border-[#ff7a1a]/25 bg-[#ff7a1a]/12 text-[#ffe1ca]",
    emerald: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  };

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${toneClasses[tone]}`}>
      {label}
    </span>
  );
}

function InputField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm font-medium text-white/82">{label}</span>
      <div className="rounded-[24px] border border-white/10 bg-black/20 p-[1px] transition focus-within:border-transparent focus-within:bg-gradient-to-r focus-within:from-cyan-300/45 focus-within:via-white/10 focus-within:to-[#ff7a1a]/45">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-14 w-full rounded-[23px] border-0 bg-[#0b0f14] px-4 text-white outline-none placeholder:text-white/28"
        />
      </div>
    </label>
  );
}

function MetricTile({ label, value, hint = "" }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/48">{hint}</p> : null}
    </div>
  );
}

function ResultStrip({
  profile,
  accent,
  isWinner,
  categoryWins,
}: {
  profile: ComparedProfile;
  accent: "left" | "right";
  isWinner: boolean;
  categoryWins: number;
}) {
  const accentTone = accent === "left" ? "text-cyan-200/84" : "text-orange-100/84";
  const accentBackground =
    accent === "left"
      ? "bg-[linear-gradient(180deg,rgba(34,211,238,0.16),rgba(255,255,255,0.03))]"
      : "bg-[linear-gradient(180deg,rgba(255,122,26,0.18),rgba(255,255,255,0.03))]";

  return (
    <div className={`p-6 ${accentBackground}`}>
      <div className="flex flex-wrap items-start gap-4">
        <div className="relative h-[84px] w-[84px] overflow-hidden rounded-[24px] border border-white/10">
          <Image src={profile.basic.avatar} alt={profile.basic.name} fill sizes="84px" className="object-cover" />
        </div>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-white">{profile.basic.name}</h2>
            {isWinner ? <Badge label="Overall winner" tone="amber" /> : null}
          </div>
          <p className={`mt-2 text-sm ${accentTone}`}>{displayHandle(profile)}</p>
          <p className="mt-3 text-sm text-white/56">{profile.basic.accountAgeLabel} on GitHub</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <MetricTile label="Developer score" value={formatDecimal(profile.developerScore)} hint="Weighted final score" />
        <MetricTile label="Followers" value={formatCompactNumber(profile.basic.followers)} />
        <MetricTile label="Category wins" value={formatNumber(categoryWins)} hint="Across 6 dimensions" />
      </div>
    </div>
  );
}
function OverallWinnerBanner({ comparison }: { comparison: ProfileComparisonResult }) {
  const [left, right] = comparison.profiles;
  const overallWinner = winnerLabel(comparison.summary.overallWinner, left, right);
  const scoreGap = Math.abs(left.developerScore - right.developerScore);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-px bg-white/10 xl:grid-cols-[1fr_360px_1fr]">
        <ResultStrip
          profile={left}
          accent="left"
          isWinner={comparison.summary.overallWinner === left.basic.username}
          categoryWins={comparison.summary.categoryWinCounts[left.basic.username] || 0}
        />

        <div className="flex flex-col justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] p-6 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/42">Multi-factor verdict</p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white">{comparison.summary.overallWinner === "Tie" ? "Dead Heat" : overallWinner}</h2>
          <p className="mt-4 text-sm leading-6 text-white/60">{comparison.summary.overallReason}</p>

          <div className="mt-6 rounded-[26px] border border-[#ff7a1a]/20 bg-black/25 p-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">Score gap</p>
            <p className="mt-3 text-4xl font-semibold text-[#ffe1ca]">{formatDecimal(scoreGap)}</p>
            <p className="mt-2 text-sm text-white/56">Generated {formatGeneratedAt(comparison.generatedAt)}</p>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {SCORE_DIMENSIONS.map((dimension) => {
              const key = `${dimension}Winner` as const;
              return (
                <Badge
                  key={dimension}
                  label={`${SCORE_LABELS[dimension]}: ${winnerLabel(comparison.summary[key], left, right)}`}
                  tone="slate"
                />
              );
            })}
          </div>
        </div>

        <ResultStrip
          profile={right}
          accent="right"
          isWinner={comparison.summary.overallWinner === right.basic.username}
          categoryWins={comparison.summary.categoryWinCounts[right.basic.username] || 0}
        />
      </div>
    </Card>
  );
}

function OverviewCard({ profile, isWinner }: { profile: ComparedProfile; isWinner: boolean }) {
  return (
    <Card className={`p-6 ${isWinner ? "border-[#ff7a1a]/35 bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(255,255,255,0.03))]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-[80px] w-[80px] overflow-hidden rounded-[24px] border border-white/10">
            <Image src={profile.basic.avatar} alt={profile.basic.name} fill sizes="80px" className="object-cover" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl font-semibold text-white">{profile.basic.name}</h3>
              {isWinner ? <Badge label="Leader" tone="amber" /> : null}
            </div>
            <p className="mt-2 text-sm text-cyan-200/82">{displayHandle(profile)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.basic.hasLocation ? <Badge label={profile.basic.location} tone="slate" /> : null}
              {profile.basic.hasWebsite ? <Badge label="Website linked" tone="emerald" /> : null}
              {profile.basic.hasBio ? <Badge label="Bio present" tone="cyan" /> : null}
            </div>
          </div>
        </div>
        <MetricTile label="Developer score" value={`${formatDecimal(profile.developerScore)} / 100`} />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Followers" value={formatCompactNumber(profile.basic.followers)} />
        <MetricTile label="Following" value={formatCompactNumber(profile.basic.following)} />
        <MetricTile label="Public repos" value={formatCompactNumber(profile.basic.publicRepos)} />
        <MetricTile label="Updated < 6m" value={formatNumber(profile.metrics.reposUpdatedLast6Months)} />
      </div>

      <div className="mt-5 rounded-[26px] border border-white/10 bg-black/20 p-5">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Profile snapshot</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          {profile.basic.bio || "No public bio added to this profile yet."}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricTile label="Total stars" value={formatCompactNumber(profile.metrics.totalStars)} />
          <MetricTile label="Total forks" value={formatCompactNumber(profile.metrics.totalForks)} />
          <MetricTile label="Total watchers" value={formatCompactNumber(profile.metrics.totalWatchers)} />
          <MetricTile label="Languages" value={formatNumber(profile.metrics.totalLanguagesUsed)} />
        </div>
      </div>
    </Card>
  );
}

function RadarChart({ left, right }: { left: ComparedProfile; right: ComparedProfile }) {
  const size = 360;
  const center = size / 2;
  const radius = 118;
  const levels = [20, 40, 60, 80, 100];

  function pointFor(score: number, index: number) {
    const angle = (-Math.PI / 2) + (index / SCORE_DIMENSIONS.length) * Math.PI * 2;
    const scaledRadius = (radius * score) / 100;
    return {
      x: center + Math.cos(angle) * scaledRadius,
      y: center + Math.sin(angle) * scaledRadius,
    };
  }

  function polygonPoints(scores: number[]) {
    return scores.map((score, index) => {
      const point = pointFor(score, index);
      return `${point.x},${point.y}`;
    }).join(" ");
  }

  const leftPolygon = polygonPoints(SCORE_DIMENSIONS.map((dimension) => left.scores[dimension]));
  const rightPolygon = polygonPoints(SCORE_DIMENSIONS.map((dimension) => right.scores[dimension]));

  return (
    <Card className="p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr] xl:items-center">
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${size} ${size}`} className="mx-auto h-[340px] w-[340px]">
            {levels.map((level) => (
              <polygon
                key={level}
                points={polygonPoints(SCORE_DIMENSIONS.map(() => level))}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
            ))}

            {SCORE_DIMENSIONS.map((dimension, index) => {
              const edgePoint = pointFor(100, index);
              const labelPoint = pointFor(114, index);
              return (
                <g key={dimension}>
                  <line x1={center} y1={center} x2={edgePoint.x} y2={edgePoint.y} stroke="rgba(255,255,255,0.12)" />
                  <text x={labelPoint.x} y={labelPoint.y} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.72)" fontSize="11" fontFamily="monospace">
                    {SCORE_LABELS[dimension]}
                  </text>
                </g>
              );
            })}

            <polygon points={leftPolygon} fill="rgba(34,211,238,0.16)" stroke="#67e8f9" strokeWidth="2.4" />
            <polygon points={rightPolygon} fill="rgba(255,122,26,0.16)" stroke="#fb923c" strokeWidth="2.4" />
          </svg>
        </div>

        <div className="space-y-4">
          {SCORE_DIMENSIONS.map((dimension) => {
            const leftScore = left.scores[dimension];
            const rightScore = right.scores[dimension];
            const winner = compareNumbers(leftScore, rightScore);
            const winnerText = winner === "left" ? displayHandle(left) : winner === "right" ? displayHandle(right) : "Tie";

            return (
              <div key={dimension} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-white/78">{SCORE_LABELS[dimension]}</p>
                  <Badge label={winnerText} tone="slate" />
                </div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/54">
                      <span>{displayHandle(left)}</span>
                      <span>{formatDecimal(leftScore)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-300 to-sky-400" style={{ width: scoreBarWidth(leftScore) }} />
                    </div>
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs text-white/54">
                      <span>{displayHandle(right)}</span>
                      <span>{formatDecimal(rightScore)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#ff7a1a] to-amber-300" style={{ width: scoreBarWidth(rightScore) }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
function DimensionTable({ left, right }: { left: ComparedProfile; right: ComparedProfile }) {
  const rows = [
    ...SCORE_DIMENSIONS.map((dimension) => ({
      label: SCORE_LABELS[dimension],
      weight: FINAL_SCORE_WEIGHTS[dimension],
      leftValue: left.scores[dimension],
      rightValue: right.scores[dimension],
    })),
    {
      label: "Developer Score",
      weight: 1,
      leftValue: left.developerScore,
      rightValue: right.developerScore,
    },
  ];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-[1.2fr_1fr_1fr] border-b border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold text-white/78">
        <span>Metric</span>
        <span>{displayHandle(left)}</span>
        <span>{displayHandle(right)}</span>
      </div>

      <div className="divide-y divide-white/8">
        {rows.map((row) => {
          const winner = compareNumbers(row.leftValue, row.rightValue);
          const isFinalScore = row.label === "Developer Score";

          return (
            <div key={row.label} className={`grid grid-cols-[1.2fr_1fr_1fr] px-5 py-4 text-sm ${isFinalScore ? "bg-[#ff7a1a]/8" : "bg-transparent"}`}>
              <div>
                <p className="font-medium text-white/88">{row.label}</p>
                <p className="mt-1 text-xs text-white/44">{row.label === "Developer Score" ? "Final weighted score" : `${Math.round(row.weight * 100)}% weight in final score`}</p>
              </div>
              <span className={winner === "left" ? "font-semibold text-cyan-200" : "text-white/68"}>{formatDecimal(row.leftValue)}</span>
              <span className={winner === "right" ? "font-semibold text-orange-100" : "text-white/68"}>{formatDecimal(row.rightValue)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RepositoryCard({ repository, rank }: { repository: ComparedRepository; rank: number }) {
  return (
    <a
      href={repository.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-black/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-xs text-white/60">
              {rank}
            </span>
            <div>
              <p className="font-semibold text-white">{repository.name}</p>
              <p className="mt-1 text-xs text-white/44">{repository.language}</p>
            </div>
          </div>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
          {formatNumber(repository.stars)} stars
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-white/58">{repository.description || "No description provided."}</p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/56">
        <span className="rounded-full border border-white/10 px-3 py-1">Forks: {formatNumber(repository.forks)}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">Watchers: {formatNumber(repository.watchers)}</span>
        <span className="rounded-full border border-white/10 px-3 py-1">Size: {formatRepoSize(repository.size)}</span>
        {repository.hasLicense ? <span className="rounded-full border border-white/10 px-3 py-1">{repository.licenseName}</span> : null}
      </div>
    </a>
  );
}

function RepositoryColumn({ title, repositories }: { title: string; repositories: ComparedRepository[] }) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <Badge label="Top 3 by stars" tone="slate" />
      </div>
      <div className="mt-5 space-y-4">
        {repositories.length ? (
          repositories.map((repository, index) => (
            <RepositoryCard key={repository.id} repository={repository} rank={index + 1} />
          ))
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            No repositories available for this profile.
          </div>
        )}
      </div>
    </Card>
  );
}

function LanguageCard({ profile }: { profile: ComparedProfile }) {
  const maxRepoCount = Math.max(1, ...profile.metrics.topLanguages.map((language) => language.repos));
  const gradients = [
    "from-cyan-400 to-sky-400",
    "from-emerald-400 to-cyan-400",
    "from-orange-400 to-amber-300",
    "from-pink-400 to-orange-400",
    "from-indigo-400 to-cyan-400",
  ];

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{displayHandle(profile)} language breakdown</h3>
          <p className="mt-2 text-sm text-white/55">Balance score: {formatDecimal(profile.metrics.languageBalanceScore)}</p>
        </div>
        <Badge label={`${formatNumber(profile.metrics.totalLanguagesUsed)} languages`} tone="slate" />
      </div>

      <div className="mt-5 space-y-4">
        {profile.metrics.topLanguages.length ? (
          profile.metrics.topLanguages.map((language, index) => (
            <div key={`${language.name}-${index}`}>
              <div className="mb-2 flex items-center justify-between gap-3 text-sm text-white/74">
                <span>{language.name}</span>
                <span>{language.repos} repos - {formatNumber(language.stars)} stars</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className={`h-full rounded-full bg-gradient-to-r ${gradients[index % gradients.length]}`} style={{ width: `${Math.max(8, (language.repos / maxRepoCount) * 100)}%` }} />
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/55">
            No primary language data available from public repositories.
          </div>
        )}
      </div>
    </Card>
  );
}
function SummaryCards({ comparison }: { comparison: ProfileComparisonResult }) {
  const [left, right] = comparison.profiles;
  const overallWinner = winnerLabel(comparison.summary.overallWinner, left, right);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">AI summary</p>
        <p className="mt-4 text-base leading-7 text-white/82">{comparison.summaryText}</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MetricTile label="Impact leader" value={winnerLabel(comparison.summary.impactWinner, left, right)} />
          <MetricTile label="Diversity leader" value={winnerLabel(comparison.summary.diversityWinner, left, right)} />
          <MetricTile label="Quality leader" value={winnerLabel(comparison.summary.qualityWinner, left, right)} />
        </div>
      </Card>

      <Card className="p-6 bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(255,255,255,0.03))]">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">Overall winner</p>
        <h3 className="mt-4 text-3xl font-semibold text-[#ffe1ca]">
          {comparison.summary.overallWinner === "Tie" ? "Dead Heat" : overallWinner}
        </h3>
        <p className="mt-4 text-sm leading-6 text-white/62">{comparison.summary.overallReason}</p>

        <div className="mt-6 rounded-[24px] border border-white/10 bg-black/25 p-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Score formula</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCORE_DIMENSIONS.map((dimension) => (
              <Badge key={dimension} label={`${SCORE_LABELS[dimension]} ${Math.round(FINAL_SCORE_WEIGHTS[dimension] * 100)}%`} tone="slate" />
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

function LoadingState() {
  return (
    <Card className="p-10 text-center">
      <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
      <p className="mt-4 text-sm text-white/64">
        Fetching GitHub profiles, aggregating repositories, checking README coverage, and computing multi-factor scores...
      </p>
    </Card>
  );
}

function ErrorState({ message }: { message: string }) {
  return <Card className="border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">{message}</Card>;
}

function EmptyState() {
  return (
    <Card className="p-6 sm:p-8">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            title: "Multi-factor scoring",
            description: "The engine scores productivity, diversity, popularity, impact, quality, and consistency before combining them into a final developer score.",
          },
          {
            title: "Real repository quality signals",
            description: "README coverage, descriptions, licenses, topics, repository size, and update windows all feed the comparison.",
          },
          {
            title: "Readable output",
            description: "The page turns raw GitHub data into an overview, radar chart, comparison table, top repositories, and an AI-style summary.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
            <p className="text-lg font-semibold text-white">{item.title}</p>
            <p className="mt-3 text-sm leading-6 text-white/58">{item.description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function ProfileCompareClient() {
  const [leftUsername, setLeftUsername] = useState("");
  const [rightUsername, setRightUsername] = useState("");
  const [comparison, setComparison] = useState<ProfileComparisonResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleCompare(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setComparison(null);
    setIsLoading(true);

    try {
      const nextComparison = await requestProfileComparison(leftUsername, rightUsername);
      setComparison(nextComparison);
    } catch (compareError) {
      setError(
        compareError instanceof Error
          ? compareError.message
          : "Unable to compare these GitHub profiles right now."
      );
    } finally {
      setIsLoading(false);
    }
  }

  const leftProfile = comparison?.profiles[0] || null;
  const rightProfile = comparison?.profiles[1] || null;

  return (
    <div className="min-h-screen overflow-hidden bg-[#07090c] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-140px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-120px] top-[-120px] h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[640px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
        <div className="absolute inset-0 opacity-[0.09] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:34px_34px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/74 transition hover:bg-white/[0.08] hover:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 font-mono text-xs font-semibold">GH</span>
            GitHance
          </Link>
          <div className="rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">Profile Compare</div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col py-10">
          <section className="rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-white/42">Multi-factor developer scoring</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">Compare GitHub profiles beyond simple popularity numbers.</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/64">The comparison engine aggregates repository quality, language diversity, impact, recent activity, and audience signals into a weighted developer score out of 100.</p>
            </div>

            <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-white/60">
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">6 scoring dimensions</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">README and quality coverage</span>
              <span className="rounded-full border border-white/10 bg-black/20 px-4 py-2">Weighted final developer score</span>
            </div>

            <form onSubmit={handleCompare} className="mx-auto mt-10 max-w-5xl">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <InputField label="GitHub Username 1" value={leftUsername} onChange={setLeftUsername} placeholder="e.g. torvalds" />
                <InputField label="GitHub Username 2" value={rightUsername} onChange={setRightUsername} placeholder="e.g. gaearon" />
                <div className="flex items-end">
                  <button type="submit" disabled={isLoading} className="h-14 w-full rounded-[24px] bg-[#ff7a1a] px-6 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto">
                    {isLoading ? "Comparing..." : "Compare Profiles"}
                  </button>
                </div>
              </div>
            </form>
          </section>
          <section className="mt-8 space-y-8">
            {isLoading ? <LoadingState /> : null}
            {!isLoading && error ? <ErrorState message={error} /> : null}
            {!isLoading && !comparison && !error ? <EmptyState /> : null}

            {!isLoading && comparison && leftProfile && rightProfile ? (
              <>
                <OverallWinnerBanner comparison={comparison} />

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 1" title="Profile overview" description="Avatar, identity, audience size, repository volume, and the final weighted developer score for each profile." />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <OverviewCard profile={leftProfile} isWinner={comparison.summary.overallWinner === leftProfile.basic.username} />
                    <OverviewCard profile={rightProfile} isWinner={comparison.summary.overallWinner === rightProfile.basic.username} />
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 2" title="Radar chart" description="A quick visual on how productivity, diversity, popularity, impact, quality, and consistency stack up side by side." />
                  <RadarChart left={leftProfile} right={rightProfile} />
                </section>

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 3" title="Metric comparison table" description="Each dimension stays on a 0-100 scale, then rolls into the weighted developer score shown at the bottom." />
                  <DimensionTable left={leftProfile} right={rightProfile} />
                </section>

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 4" title="Top repositories" description="The strongest public repositories for each user, ranked by stars with forks, watchers, size, and license context." />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <RepositoryColumn title={`${displayHandle(leftProfile)} top repositories`} repositories={leftProfile.metrics.topRepositories} />
                    <RepositoryColumn title={`${displayHandle(rightProfile)} top repositories`} repositories={rightProfile.metrics.topRepositories} />
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 5" title="Language breakdown" description="Top languages are aggregated across repositories and weighted with repo distribution, stars, and language balance." />
                  <div className="grid gap-5 xl:grid-cols-2">
                    <LanguageCard profile={leftProfile} />
                    <LanguageCard profile={rightProfile} />
                  </div>
                </section>

                <section className="space-y-5">
                  <SectionHeading eyebrow="Section 6" title="AI summary" description="A readable synthesis of impact, diversity, quality, and the overall winner using the multi-factor scoring model." />
                  <SummaryCards comparison={comparison} />
                </section>
              </>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}


