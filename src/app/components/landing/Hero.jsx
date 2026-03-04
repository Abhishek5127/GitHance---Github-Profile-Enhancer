"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const modes = [
  {
    id: "profile",
    label: "Profile",
    title: "Design a GitHub profile that looks intentional.",
    copy: "Compose sections, tune colors, and ship a profile README that feels crafted, not copied.",
    detail: "Drag blocks, preview instantly, publish in one click.",
    blocklist: [
      { label: "Analyze Profile", path: "/profile" },
      { label: "analyze", path: "/profile" },
      { label: "Analyze Repositories", path: "/analyze" },
    ],
    colorPalette: ['green', 'yellow', 'blue']
  },
  {
    id: "readme",
    label: "README",
    title: "Ship clean project docs without the scramble.",
    copy: "Generate README structure based on your repo and fill the gaps with focused prompts.",
    detail: "Installation, usage, and structure done right.",
    blocklist: [
      { label: "Build Readme", path: "profile-builder" },
      { label: "Repository Readme", path: "/repo-builder" },
      { label: "Analyze Repositories", path: "/analyze" },
    ],
    colorPalette: ['green', 'yellow', 'blue']
  },
  {
    id: "insights",
    label: "Insights",
    title: "See what matters inside any repository.",
    copy: "Surface key files, map structure, and understand codebases faster.",
    detail: "Perfect for audits, onboarding, and reviews.",
    blocklist: [
      { label: "Analyze Profile", path: "/profile" },
      { label: "Get Profile data", path: "/profile" },
      { label: "Analyze Repository", path: "/analyze" },
    ],
    colorPalette: ['green', 'yellow', 'blue']
  },
];

const colorMap = {
  green: "bg-green-500/15 text-green-400 border border-green-500/30",
  yellow: "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30",
  blue: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
};


export default function Hero() {
  const [active, setActive] = useState(modes[0]);
  const router = useRouter();

  return (
    <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-20 pt-16 text-white lg:grid-cols-[1.1fr_0.9fr]">
      <div>
        <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/70">
          GitHance Platform
        </div>

        <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
          Build a GitHub presence
          <span className="block text-white/80">that ships with confidence.</span>
        </h1>

        <p className="mt-5 max-w-xl text-base text-white/70">
          A new workflow for developer branding. Create profile READMEs, analyze repos, and keep everything consistent
          without the chaos.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button onClick={() => { router.push('/profile-builder') }} className="rounded-full cursor-pointer bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,122,26,0.45)] transition hover:translate-y-[-1px] hover:bg-[#ff8c3a]">
            Start building
          </button>
          <button className="rounded-full border cursor-pointer border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
            Watch demo
          </button>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-white/60">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">3 min setup</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">No design tools</span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Built for teams</span>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.5)]">
        <div className="flex flex-wrap items-center gap-3">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setActive(mode)}
              className={`rounded-full px-4 py-2 text-xs cursor-pointer font-semibold transition ${active.id === mode.id
                  ? "bg-white text-black"
                  : "border border-white/15 text-white/70 hover:bg-white/10"
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1115] p-5">
          <div className="flex items-center justify-between text-xs text-white/50">
            <span>GitHance Studio</span>
            <span>Live preview</span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">{active.title}</h3>
          <p className="mt-2 text-sm text-white/60">{active.copy}</p>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            {active.detail}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {active.blocklist?.map((item, index) => {
              const colorKey = active.colorPalette?.[index] || "blue";

              return (
                <div
                  onClick={() => {
                    if (item.path) router.push(item.path);
                  }}
                  key={index}
                  className={`h-10 flex items-center justify-center rounded-lg text-xs font-semibold cursor-pointer transition hover:scale-[1.02]
        ${colorMap[colorKey]}`}
                >
                  {item.label}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
}
