"use client";

import Image from "next/image";
import { assets } from "@/app/assets/assets";
import { antonio, poppins, danfo } from "@/app/fonts";

const headlineStats = [
  {
    value: "4X",
    label: "faster README iteration",
  },
  {
    value: "8",
    label: "polished blocks ready to mix",
  },
  {
    value: "1",
    label: "workspace for profile and repo polish",
  },
];

const featureCards = [
  {
    title: "Automated README generation",
    description: "Build clear project docs from repository context instead of starting from a blank page.",
    icon: assets.AI,
    accent: "from-[#ff7a1a]/20 via-[#ff7a1a]/8 to-transparent",
  },
  {
    title: "Auto-updating visuals",
    description: "Keep streaks, contribution views, and profile surfaces from drifting out of date.",
    icon: assets.AutoUpdate,
    accent: "from-emerald-500/18 via-emerald-500/8 to-transparent",
  },
  {
    title: "Intentional presentation",
    description: "Shape a GitHub presence that feels designed, not stitched together from generic snippets.",
    icon: assets.Eye,
    accent: "from-cyan-500/18 via-cyan-500/8 to-transparent",
  },
];

const capabilityCards = [
  {
    kicker: "Analyze",
    title: "Repository context first",
    detail: "Map structure, key files, and moving parts before you write or publish.",
    icon: assets.Analyze,
  },
  {
    kicker: "Impact",
    title: "Profile polish with intent",
    detail: "Turn raw activity into presentable sections that still feel true to the work.",
    icon: assets.Impact,
  },
  {
    kicker: "Activity",
    title: "Signals that stay alive",
    detail: "Surface commit cadence and contribution patterns without manual maintenance.",
    icon: assets.Activity,
  },
  {
    kicker: "Secure",
    title: "Confidence before sharing",
    detail: "Review important repo signals and quality cues before a README goes live.",
    icon: assets.Secure,
  },
];

export default function GrowthCard() {
  return (
    <div className="mx-auto w-full max-w-[95%]">
      <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-stretch">
        <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#101010]/95 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
          <div className="pointer-events-none absolute -right-2 top-2 flex text-[56px] leading-none text-[#ff7a1a]/18 sm:right-4 sm:top-4 sm:text-[92px] lg:text-[132px]">
            <span className={danfo.className}>{">"}</span>
            <span className={danfo.className}>{">"}</span>
            <span className={danfo.className}>{">"}</span>
          </div>

          <div className="relative max-w-3xl">
            <span className={`${poppins.className} inline-flex rounded-full border border-[#ff7a1a]/25 bg-[#ff7a1a]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffb37f]`}>
              Solutions Surface
            </span>
            <h2 className={`${antonio.className} mt-6 text-4xl leading-none text-white sm:text-5xl lg:text-6xl`}>
              One focused UI for README polish, repo clarity, and profile momentum.
            </h2>
            <p className={`${poppins.className} mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base`}>
              The rotating component stack is gone. This section now tells a single story around GrowthCard, combining proof points, repository preview, and product capabilities in one responsive layout.
            </p>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-3">
            {headlineStats.map((stat) => (
              <div key={stat.label} className="rounded-[24px] border border-white/10 bg-white/[0.045] p-4 backdrop-blur-sm">
                <div className={`${antonio.className} text-4xl leading-none text-[#ff7a1a] sm:text-5xl`}>
                  {stat.value}
                </div>
                <p className={`${poppins.className} mt-3 text-sm leading-6 text-white/60`}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="relative mt-8 grid gap-4 xl:grid-cols-3">
            {featureCards.map((item) => (
              <article
                key={item.title}
                className={`rounded-[24px] border border-white/10 bg-gradient-to-br ${item.accent} p-4 backdrop-blur-sm`}
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/25">
                  <Image src={item.icon} alt="" className="h-5 w-5" />
                </div>
                <h3 className={`${antonio.className} mt-5 text-2xl leading-none text-white`}>
                  {item.title}
                </h3>
                <p className={`${poppins.className} mt-3 text-sm leading-6 text-white/62`}>
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[32px] border border-white/10 bg-[#111418]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`${poppins.className} text-xs font-semibold uppercase tracking-[0.3em] text-white/40`}>
                  Live Preview
                </p>
                <h3 className={`${antonio.className} mt-3 text-3xl leading-none text-white sm:text-4xl`}>
                  Repository analysis that feels presentable.
                </h3>
              </div>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                synced view
              </span>
            </div>

            <div className="mt-5 mx-auto max-w-[520px] overflow-hidden rounded-[24px] border border-white/10 bg-[#0b0d0f]">
              <Image
                src={assets.AnalyzeGraph}
                alt="Repository analysis preview"
                className="h-auto w-full object-cover"
                sizes="(min-width: 920px) 22vw, 70vw"
              />
            </div>

            <div className="grid gap-4 mt-5 sm:grid-cols-2">
              {capabilityCards.map((item) => (
                <article key={item.title} className="rounded-[26px] border border-white/10 bg-[#0f1115]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <span className={`${poppins.className} text-[11px] font-semibold uppercase tracking-[0.26em] text-white/38`}>
                      {item.kicker}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <Image src={item.icon} alt="" className="h-5 w-5 invert" />
                    </div>
                  </div>
                  <h3 className={`${antonio.className} mt-1 text-2xl leading-none text-white`}>
                    {item.title}
                  </h3>
                  <p className={`${poppins.className} mt-3 text-sm leading-6 text-white/62`}>
                    {item.detail}
                  </p>
                </article>
              ))}
            </div>
          </div>


        </div>
      </div>
    </div>
  );
}
