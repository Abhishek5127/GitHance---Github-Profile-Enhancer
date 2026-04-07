"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";

function normalizeUsernameInput(value: string) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

async function requestProfileComparison(
  leftUsernameInput: string,
  rightUsernameInput: string
) {
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

  return payload.comparison;
}

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

function MetricTile({ label, value, hint = "" }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-white/48">{hint}</p> : null}
    </div>
  );
}

function RepoCard({ repository }: { repository: any }) {
  return (
    <a
      href={repository?.htmlUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[24px] border border-white/10 bg-black/20 p-4 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-black/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{repository?.name}</p>
          <p className="mt-1 text-xs text-white/44">{repository?.language || "Unknown"}</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70">
          {formatNumber(repository?.stars || 0)} stars
        </div>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/58">
        {repository?.description || "No description provided."}
      </p>
    </a>
  );
}

function ProfileSummaryCard({ profile, tone }: { profile: any; tone: "left" | "right" }) {
  const accentClass =
    tone === "left"
      ? "bg-[linear-gradient(180deg,rgba(34,211,238,0.14),rgba(255,255,255,0.03))]"
      : "bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(255,255,255,0.03))]";

  return (
    <div className={`rounded-[30px] border border-white/10 p-6 ${accentClass}`}>
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-[80px] w-[80px] overflow-hidden rounded-[24px] border border-white/10">
          <Image src={profile?.basic?.avatar} alt={profile?.basic?.name || "Avatar"} fill sizes="80px" className="object-cover" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white">{profile?.basic?.name}</h2>
          <p className="mt-1 text-sm text-white/60">@{profile?.basic?.username}</p>
          <p className="mt-2 text-sm text-white/55">{profile?.basic?.accountAgeLabel || "GitHub profile"}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Developer score" value={formatDecimal(profile?.developerScore)} />
        <MetricTile label="Followers" value={formatCompactNumber(profile?.basic?.followers || 0)} />
        <MetricTile label="Public repos" value={formatCompactNumber(profile?.basic?.publicRepos || 0)} />
        <MetricTile label="Total stars" value={formatCompactNumber(profile?.metrics?.totalStars || 0)} />
      </div>

      <div className="mt-5 rounded-[24px] border border-white/10 bg-black/20 p-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/42">Profile snapshot</p>
        <p className="mt-3 text-sm leading-6 text-white/60">
          {profile?.basic?.bio || "No public bio added to this profile yet."}
        </p>
      </div>
    </div>
  );
}

export default function ProfileCompareClient() {
  const [leftUsername, setLeftUsername] = useState("");
  const [rightUsername, setRightUsername] = useState("");
  const [comparison, setComparison] = useState<any>(null);
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

  const leftProfile = comparison?.profiles?.[0] || null;
  const rightProfile = comparison?.profiles?.[1] || null;

  return (
    <div className="min-h-[100svh] overflow-x-clip overflow-y-hidden bg-[#07090c] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-120px] top-[-140px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(34,211,238,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute right-[-120px] top-[-120px] h-[540px] w-[540px] rounded-full bg-[radial-gradient(circle,rgba(255,122,26,0.18),transparent_68%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-[640px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-white/74 transition hover:bg-white/[0.08] hover:text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 font-mono text-xs font-semibold">GH</span>
            GitHance
          </Link>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
            Profile Compare
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col py-10">
          <section className="rounded-[42px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.055),rgba(255,255,255,0.03))] p-6 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-8 lg:p-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-white/42">Multi-factor developer scoring</p>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">Compare GitHub profiles beyond simple popularity numbers.</h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/64">The comparison engine aggregates repository quality, language diversity, impact, recent activity, and audience signals into a weighted developer score out of 100.</p>
            </div>

            <form onSubmit={handleCompare} className="mx-auto mt-10 max-w-5xl">
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto]">
                <input
                  value={leftUsername}
                  onChange={(event) => setLeftUsername(event.target.value)}
                  placeholder="GitHub username 1"
                  className="h-14 w-full rounded-[24px] border border-white/10 bg-[#0b0f14] px-4 text-white outline-none placeholder:text-white/28"
                />
                <input
                  value={rightUsername}
                  onChange={(event) => setRightUsername(event.target.value)}
                  placeholder="GitHub username 2"
                  className="h-14 w-full rounded-[24px] border border-white/10 bg-[#0b0f14] px-4 text-white outline-none placeholder:text-white/28"
                />
                <div className="flex items-end">
                  <button type="submit" disabled={isLoading} className="inline-flex min-h-14 w-full items-center justify-center rounded-[24px] bg-[#ff7a1a] px-6 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:opacity-70 lg:w-auto">
                    {isLoading ? "Comparing..." : "Compare Profiles"}
                  </button>
                </div>
              </div>
            </form>
          </section>

          <section className="mt-8 space-y-8">
            {isLoading ? (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-10 text-center shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-cyan-300" />
                <p className="mt-4 text-sm text-white/64">
                  Fetching GitHub profiles, aggregating repositories, and computing multi-factor scores...
                </p>
              </div>
            ) : null}

            {!isLoading && error ? (
              <div className="rounded-[30px] border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>
            ) : null}

            {!isLoading && comparison && leftProfile && rightProfile ? (
              <>
                <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(255,255,255,0.03))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/40">Overall winner</p>
                  <h2 className="mt-4 text-3xl font-semibold text-[#ffe1ca]">
                    {comparison?.summary?.overallWinner === "Tie" ? "Dead Heat" : `@${comparison?.summary?.overallWinner}`}
                  </h2>
                  <p className="mt-4 text-sm leading-6 text-white/62">{comparison?.summary?.overallReason}</p>
                </section>

                <div className="grid gap-5 xl:grid-cols-2">
                  <ProfileSummaryCard profile={leftProfile} tone="left" />
                  <ProfileSummaryCard profile={rightProfile} tone="right" />
                </div>

                <section className="grid gap-5 xl:grid-cols-2">
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                    <h3 className="text-xl font-semibold text-white">@{leftProfile?.basic?.username} top repositories</h3>
                    <div className="mt-5 space-y-4">
                      {(leftProfile?.metrics?.topRepositories || []).slice(0, 3).map((repository: any) => (
                        <RepoCard key={repository?.id} repository={repository} />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                    <h3 className="text-xl font-semibold text-white">@{rightProfile?.basic?.username} top repositories</h3>
                    <div className="mt-5 space-y-4">
                      {(rightProfile?.metrics?.topRepositories || []).slice(0, 3).map((repository: any) => (
                        <RepoCard key={repository?.id} repository={repository} />
                      ))}
                    </div>
                  </div>
                </section>
              </>
            ) : !isLoading && !error ? (
              <div className="rounded-[30px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
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
                      description: "The page turns raw GitHub data into overview cards, top repositories, and an overall winner summary.",
                    },
                  ].map((item) => (
                    <div key={item.title} className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                      <p className="text-lg font-semibold text-white">{item.title}</p>
                      <p className="mt-3 text-sm leading-6 text-white/58">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}
