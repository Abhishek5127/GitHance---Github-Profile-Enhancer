"use client";

import { motion } from "framer-motion";
import { antonio, poppins } from "@/app/fonts";
import GlassPanel from "@/app/components/ui/GlassPanel";

const services = [
  {
    id: "security-analysis",
    title: "Security Analysis",
    copy: "Detect vulnerabilities and improve code safety automatically",
    kicker: "Repo scanning",
    glowClassName: "bg-cyan-400/24",
    Visual: SecurityVisual,
  },
  {
    id: "profile-comparison",
    title: "Profile Comparison",
    copy: "Compare profiles and identify growth opportunities",
    kicker: "Benchmark insights",
    glowClassName: "bg-violet-400/24",
    Visual: ProfileComparisonVisual,
  },
  {
    id: "readme-generation",
    title: "README Generation",
    copy: "Generate aesthetic, AI-powered READMEs instantly",
    kicker: "Transformation engine",
    glowClassName: "bg-blue-400/24",
    Visual: ReadmeGenerationVisual,
  },
  {
    id: "preview-export",
    title: "Preview and Export",
    copy: "Preview your README in a GitHub-style frame, then copy or download it without surprises.",
    kicker: "Preview workflow",
    glowClassName: "bg-cyan-300/20",
    Visual: PreviewExportVisual,
  },
];

function SecurityVisual() {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-[#090e17]/90 p-4">
      <div className="flex items-center justify-between text-[11px] text-cyan-100/85">
        <span>Scan 76 files</span>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/12 px-2 py-0.5 text-[10px] text-amber-200">
          2 warnings
        </span>
      </div>
      <div className="mt-3 grid grid-cols-8 gap-1">
        {[40, 85, 60, 95, 45, 70, 88, 55].map((value, index) => (
          <div key={`security-${value}-${index}`} className="h-12 rounded-sm bg-white/5">
            <div
              className="h-full w-full rounded-sm bg-gradient-to-t from-cyan-400/45 to-cyan-300/20"
              style={{ clipPath: `inset(${100 - value}% 0 0 0)` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2 text-[10px] text-rose-100/90">
        <span>High severity dependency found</span>
        <span>Fix now</span>
      </div>
    </div>
  );
}

function ProfileComparisonVisual() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {["Profile A", "Profile B"].map((label, cardIndex) => (
        <div key={label} className="rounded-2xl border border-white/14 bg-[#0a1018]/88 p-3">
          <div className="flex items-center justify-between text-[10px] text-white/70">
            <span>{label}</span>
            <span>{cardIndex === 0 ? "86" : "78"} score</span>
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1">
            {[35, 55, 40, 68, 52, 78, 58].map((value, index) => (
              <div key={`profile-${cardIndex}-${value}-${index}`} className="h-6 rounded-sm bg-white/5">
                <div
                  className={`h-full w-full rounded-sm ${
                    cardIndex === 0 ? "bg-cyan-300/55" : "bg-violet-300/55"
                  }`}
                  style={{ clipPath: `inset(${100 - value}% 0 0 0)` }}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-white/60">
            <span className="rounded-full border border-white/15 px-2 py-0.5">Commits</span>
            <span className="rounded-full border border-white/15 px-2 py-0.5">Reviews</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function ReadmeGenerationVisual() {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
      <div className="rounded-2xl border border-white/14 bg-[#0a1018]/90 p-3 text-[10px] text-white/58">
        <p>README draft</p>
        <p className="mt-2 rounded border border-white/10 bg-white/5 p-2">
          Draft is missing setup steps, architecture notes, and contribution guidance.
        </p>
      </div>
      <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-300/16 text-xs text-cyan-100">
        AI
      </div>
      <div className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 p-3 text-[10px] text-cyan-50">
        <p>Polished README</p>
        <p className="mt-2 rounded border border-cyan-200/30 bg-[#0d1117]/90 p-2 text-white/75">
          Intro, stack badges, architecture map, setup, and contribution guide generated.
        </p>
      </div>
    </div>
  );
}

function PreviewExportVisual() {
  return (
    <div className="rounded-2xl border border-white/14 bg-[#0a1018]/88 p-4">
      <div className="flex items-center justify-between text-[10px] text-white/70">
        <span>Preview to export</span>
        <span className="rounded-full border border-emerald-300/35 bg-emerald-300/14 px-2 py-0.5 text-emerald-100">
          export ready
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {["preview: verify GitHub layout", "copy: markdown text", "download: README package"].map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-[10px] text-white/70">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 animate-pulse" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-300 to-blue-300 animate-pulse" />
      </div>
    </div>
  );
}

export default function ServicesSection() {
  return (
    <section
      id="core-services"
      aria-labelledby="core-services-heading"
      className="relative mx-auto mt-20 w-full max-w-7xl px-4 pb-20 sm:mt-24 sm:px-6 lg:mt-28 lg:px-4"
    >
      <div className="pointer-events-none absolute left-0 top-16 h-60 w-60 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-6 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative mb-8">
        <p className={`${poppins.className} text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/85`}>
          Core Features
        </p>
        <h2
          id="core-services-heading"
          className={`${antonio.className} mt-3 text-4xl leading-none text-white sm:text-5xl lg:text-6xl`}
        >
          Built for profile growth, repository trust, and conversion.
        </h2>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {services.map((service, index) => (
          <motion.div
            key={service.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.45, delay: index * 0.08 }}
          >
            <GlassPanel
              className="h-full p-5 transition duration-300 hover:-translate-y-1 hover:border-cyan-300/45 sm:p-6"
              glowClassName={service.glowClassName}
            >
              <div className="flex items-center justify-between gap-3">
                <span className={`${poppins.className} rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100`}>
                  {service.kicker}
                </span>
                <span className={`${poppins.className} text-[10px] uppercase tracking-[0.2em] text-white/45`}>
                  GitHance
                </span>
              </div>

              <h3 className={`${antonio.className} mt-4 text-3xl leading-none text-white`}>{service.title}</h3>
              <p className={`${poppins.className} mt-3 text-sm leading-6 text-white/62`}>{service.copy}</p>

              <div className="mt-5">{service.Visual ? <service.Visual /> : null}</div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </section>
  );
}


