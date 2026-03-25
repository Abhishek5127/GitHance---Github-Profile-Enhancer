import Image from "next/image";
import Link from "next/link";
import { assets } from "@/app/assets/assets";

const steps = [
  {
    id: "01",
    title: "Connect your GitHub context",
    detail: "Authenticate once, pull repository metadata, and bring profile signals into a single workspace.",
    badge: "OAuth sync",
    icon: assets.Github,
  },
  {
    id: "02",
    title: "Analyze what actually matters",
    detail: "Inspect repositories, key files, and code structure so the README and profile are built from real context.",
    badge: "AI review",
    icon: assets.Analyze,
  },
  {
    id: "03",
    title: "Shape the public-facing surface",
    detail: "Compose profile blocks, documentation sections, and visuals into something that feels intentional.",
    badge: "Live preview",
    icon: assets.Impact,
  },
  {
    id: "04",
    title: "Publish and keep it alive",
    detail: "Ship updates confidently and keep profile assets aligned as repositories and contribution signals change.",
    badge: "Repeatable",
    icon: assets.Repair,
  },
];

const summary = [
  {
    label: "Inputs",
    value: "GitHub profile, repositories, contribution data",
  },
  {
    label: "Workspace",
    value: "Builder, analyzer, preview, publish flow",
  },
  {
    label: "Outcome",
    value: "Cleaner README surfaces and sharper profile presentation",
  },
];

export default function Workflow() {
  return (
    <section id="process" className="mx-auto w-full max-w-[95%] px-4 pb-24">
      <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[#0f1115]/95 p-6 text-white shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute -left-16 top-0 h-56 w-56 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.2),_transparent_68%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-8 h-64 w-64 rounded-full bg-[radial-gradient(circle,_rgba(74,222,128,0.14),_transparent_70%)] blur-3xl" />

        <div className="relative grid gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
          <div className="max-w-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.36em] text-[#ffb37f]">Workflow</p>
            <h2 className="mt-5 text-3xl font-semibold text-white sm:text-4xl lg:text-5xl">
              A shipping loop for GitHub presence, not a one-time generator.
            </h2>
            <p className="mt-5 max-w-lg text-sm leading-7 text-white/65 sm:text-base">
              GitHance is built around a repeatable cycle: connect GitHub, analyze repositories, shape profile and README surfaces, then keep everything current as the work evolves.
            </p>

            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">GitHub OAuth</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Repository insight</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Live preview</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Clean publish flow</span>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/profile-builder"
                className="inline-flex items-center justify-center rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-black shadow-[0_0_30px_rgba(255,122,26,0.3)] transition hover:bg-[#ff8c3a]"
              >
                Open builder
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Run repository analysis
              </Link>
            </div>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm">
              <div className="grid gap-4 sm:grid-cols-3">
                {summary.map((item) => (
                  <div key={item.label} className="rounded-[22px] border border-white/10 bg-[#0b0d0f]/70 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/38">
                      {item.label}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/68">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-10 hidden h-[calc(100%-5rem)] w-px bg-gradient-to-b from-[#ff7a1a]/55 via-white/12 to-transparent sm:block" />
            <div className="grid gap-4">
              {steps.map((step) => (
                <article
                  key={step.id}
                  className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.045] p-5 backdrop-blur-sm shadow-[0_22px_70px_rgba(0,0,0,0.28)] sm:p-6"
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-[#0b0d0f] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
                        <Image src={step.icon} alt="" className="h-5 w-5 invert" />
                      </div>
                      <div className="text-xs font-semibold uppercase tracking-[0.34em] text-white/35 sm:hidden">
                        Step {step.id}
                      </div>
                    </div>

                    <div>
                      <div className="hidden text-xs font-semibold uppercase tracking-[0.34em] text-white/35 sm:block">
                        Step {step.id}
                      </div>
                      <h3 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
                        {step.title}
                      </h3>
                      <p className="mt-3 max-w-2xl text-sm leading-6 text-white/62">
                        {step.detail}
                      </p>
                    </div>

                    <div className="justify-self-start sm:justify-self-end">
                      <span className="inline-flex rounded-full border border-white/10 bg-[#0b0d0f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#ffb37f]">
                        {step.badge}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
