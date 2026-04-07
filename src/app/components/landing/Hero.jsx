"use client";

import { useState } from "react";
import { antonio, poppins } from "@/app/fonts";
import { saveProfileBuilderContextCommitStatsSnapshot } from "@/app/lib/profileBuilderContext";
import LandingFeatureLink from "./LandingFeatureLink";
import { useLandingFeatureGate } from "./LandingFeatureGate";

const ANALYZE_REPOSITORIES_PATH = "/analyze";

const modes = [
  {
    id: "profile",
    label: "Profile",
    title: "Build a GitHub profile README that feels intentional.",
    copy: "Shape developer-first sections, live contribution visuals, and a profile README that communicates your strengths clearly.",
    detail: "Profile builder, profile comparison, and repository analysis work together inside one public workspace linked to the GitHub username you provide.",
    blocklist: [
      { label: "Analyze Repositories", path: "/analyze" },
      { label: "Compare Profiles", path: "/profile-compare" },
      { label: "Analyze Repositories", path: ANALYZE_REPOSITORIES_PATH },
    ],
    colorPalette: ["green", "yellow", "blue"],
  },
  {
    id: "readme",
    label: "README",
    title: "Generate cleaner GitHub READMEs from real repository context.",
    copy: "Move from repository preview to README creation with AI guidance that is grounded in your codebase, structure, and documentation gaps.",
    detail: "Repository preview, README generation, and security review stay one click apart so documentation stays close to the code.",
    blocklist: [
      { label: "Build Profile README", path: "/profile-builder" },
      { label: "Repository README", path: ANALYZE_REPOSITORIES_PATH },
      { label: "Security Analysis", path: "/analyze" },
    ],
    colorPalette: ["green", "yellow", "blue"],
  },
];

const colorMap = {
  green: "bg-green-500/15 text-green-400 border border-green-500/30",
  yellow: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  blue: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};

export default function Hero() {
  const [active, setActive] = useState(modes[0]);
  const [isLaunchingBuilder, setIsLaunchingBuilder] = useState(false);
  const {
    landingUsername,
    setLandingUsername,
    canAccessFeature,
    normalizedLandingUsername,
    persistLandingUsername,
  } = useLandingFeatureGate();

  const handlePersonalStart = async (event) => {
    event.preventDefault();
    if (!canAccessFeature || isLaunchingBuilder) return;

    const username = persistLandingUsername();
    if (!username) return;

    setIsLaunchingBuilder(true);

    try {
      const response = await fetch("/api/github/stats/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          installationId: null,
          force: false,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.ok && payload?.stats) {
        saveProfileBuilderContextCommitStatsSnapshot({
          username,
          snapshot: payload.stats,
        });
      }
    } catch {
      // Ignore startup prefetch failures; the builder will refresh its own snapshot.
    } finally {
      window.location.assign("/profile-builder");
    }
  };

  return (
    <section
      id="hero"
      aria-labelledby="hero-heading"
      className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-4 pb-16 pt-12 text-white sm:px-6 sm:pb-20 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:px-4"
    >
      <div className="max-w-3xl">
        <p className={`text-xs font-semibold ${antonio.className} uppercase tracking-[0.36em] text-[#ffb37f]`}>
          GitHub README Generator + Developer Visibility Suite
        </p>
        <h1 id="hero-heading" className={`mt-4 text-4xl ${antonio.className} font-semibold leading-tight sm:text-5xl lg:text-6xl`}>
          AI-powered GitHub README generation,
          <span className={`block ${antonio.className} text-white/80`}>
            profile building, and repository analysis for developers.
          </span>
        </h1>

        <p className={`mt-5 max-w-2xl text-base ${poppins.className} leading-7 text-white/70 sm:text-lg`}>
          GitHance helps developers create GitHub profile READMEs, generate project READMEs, preview repositories,
          compare profiles, and review security signals from one public workspace built for discoverability and faster shipping.
        </p>

        <form onSubmit={handlePersonalStart} className="mt-10 max-w-2xl">
          <label htmlFor="hero-username" className={`text-[11px] font-semibold uppercase tracking-[0.34em] ${poppins.className} text-white/46`}>
            Start with your GitHub username
          </label>
          <div className="mt-4 border-b border-white/18 pb-4 transition focus-within:border-[#ff7a1a]">
            <input
              id="hero-username"
              name="username"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              value={landingUsername}
              onChange={(event) => setLandingUsername(event.target.value)}
              placeholder="your-github-username"
              className={`w-full bg-transparent text-4xl ${antonio.className} leading-none tracking-[0.08em] text-white outline-none placeholder:text-white/18 sm:text-5xl lg:text-6xl`}
            />
          </div>
          <p className={`mt-3 text-sm ${poppins.className} leading-6 text-white/52`}>
            {canAccessFeature
              ? "We'll carry this into the profile builder so commit stats, contribution graphs, and profile fetches start with the right GitHub username."
              : "Enter your GitHub username to unlock profile building, repository analysis, and comparison tools from the landing page."}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <button
              type="submit"
              disabled={!canAccessFeature || isLaunchingBuilder}
              className="inline-flex justify-center rounded-full bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,122,26,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ff8c3a] disabled:cursor-not-allowed disabled:bg-[#ff7a1a]/24 disabled:text-white/40 disabled:shadow-none disabled:hover:translate-y-0 disabled:hover:bg-[#ff7a1a]/24"
            >
              {isLaunchingBuilder ? "Loading profile builder..." : "Open profile builder"}
            </button>
            <LandingFeatureLink
              href="/analyze"
              lockedElement="button"
              className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              disabledClassName="inline-flex cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-6 py-3 text-sm font-semibold text-white/35"
            >
              Analyze repositories
            </LandingFeatureLink>
            <LandingFeatureLink
              href="/process"
              className="inline-flex rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              See how it works
            </LandingFeatureLink>
          </div>
        </form>

        <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">GitHub README generator</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Repository security review</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Developer discoverability</span>
        </div>
      </div>

      <div className="w-full max-w-xl justify-self-end rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-[0_40px_120px_rgba(0,0,0,0.5)] sm:p-5">
        <div className="flex flex-wrap items-center gap-3" role="tablist" aria-label="Workflow modes">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setActive(mode)}
              aria-pressed={active.id === mode.id}
              className={`rounded-full px-4 py-2 text-[11px] font-semibold transition sm:text-xs ${
                active.id === mode.id
                  ? "bg-white text-black"
                  : "border border-white/15 text-white/70 hover:bg-white/10"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className={`mt-6 rounded-2xl ${poppins.className} border border-white/10 bg-[#0f1115] p-4 sm:p-5`}>
          <p className="text-xs uppercase tracking-[0.24em] text-white/40">Active path</p>
          <h2 className="mt-3 text-lg font-semibold text-white">{active.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">{active.copy}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-white/60">
            {active.detail}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {active.blocklist?.map((item, index) => {
              const colorKey = active.colorPalette?.[index] || "blue";
              const itemClasses = `min-h-12 flex items-center justify-center rounded-lg px-3 py-3 text-left text-xs font-semibold sm:text-center ${colorMap[colorKey]}`;

              return (
                <LandingFeatureLink
                  href={item.path}
                  key={`${item.label}-${item.path}-${index}`}
                  className={`${itemClasses} transition hover:scale-[1.02]`}
                  disabledClassName={`${itemClasses} cursor-not-allowed opacity-45 saturate-50`}
                >
                  {item.label}
                </LandingFeatureLink>
              );
            })}
          </div>
          {canAccessFeature ? (
            <p className="mt-4 text-[11px] uppercase tracking-[0.24em] text-white/35">
              Ready for @{normalizedLandingUsername}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
