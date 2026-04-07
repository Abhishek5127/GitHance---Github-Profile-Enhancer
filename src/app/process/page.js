import Link from "next/link";
import Image from "next/image";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import JsonLd from "../components/seo/JsonLd";
import { assets } from "../assets/assets";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createHowToSchema,
} from "../lib/seo";

const processSteps = [
  {
    id: "01",
    title: "Start with a GitHub username",
    detail: "Enter the GitHub username you want to work with and pull profile, repository, and activity signals into one workspace.",
    icon: assets.Github,
  },
  {
    id: "02",
    title: "Map repository context",
    detail: "Analyze project structure, key files, and dependencies to avoid shallow documentation.",
    icon: assets.Analyze,
  },
  {
    id: "03",
    title: "Compose documentation",
    detail: "Assemble README sections and profile blocks with live feedback while context is still fresh.",
    icon: assets.Repair,
  },
  {
    id: "04",
    title: "Review presentation",
    detail: "Validate clarity, scanability, and visual hierarchy before publishing publicly.",
    icon: assets.Impact,
  },
  {
    id: "05",
    title: "Publish and iterate",
    detail: "Ship updates and re-run the loop as repositories evolve, without rebuilding from scratch.",
    icon: assets.Activity,
  },
];

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "How GitHance Works for README Generation and Repository Analysis",
  description:
    "See the GitHance process for GitHub README generation, repository analysis, profile optimization, and repeatable developer-facing documentation workflows.",
  path: "/process",
  keywords: [
    "GitHub README workflow",
    "developer documentation process",
    "repository analysis workflow",
    "GitHub profile optimization process",
  ],
});

const schemas = [
  createHowToSchema({
    name: "How GitHance works",
    description:
      "The GitHance workflow for GitHub README generation, repository analysis, and profile optimization.",
    path: "/process",
    steps: processSteps,
  }),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Process", path: "/process" },
  ]),
];

export default function ProcessPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={schemas} />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(56,189,248,0.22),_transparent_70%)] blur-3xl" />
        <LandingNav pathname="/process" />
      </div>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="rounded-[30px] border border-white/10 bg-[#111418] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.38)] sm:p-8 lg:sticky lg:top-8">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">Process</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              A repeatable loop that keeps GitHub docs aligned with code.
            </h1>
            <p className="mt-5 text-sm leading-7 text-white/65 sm:text-base">
              This is the operating model behind GitHance: each phase feeds the next so repo insight, README quality, and profile signal improve together instead of drifting apart.
            </p>
            <div className="mt-7 flex flex-col gap-3">
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200"
              >
                Start With Analysis
              </Link>
              <Link
                href="/profile-builder"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Continue In Builder
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-gradient-to-b from-cyan-300/70 via-white/20 to-transparent sm:block" />
            <div className="grid gap-4">
              {processSteps.map((step, index) => (
                <article
                  id={`step-${index + 1}`}
                  key={step.id}
                  className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_22px_72px_rgba(0,0,0,0.3)] sm:p-6"
                >
                  <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:gap-5">
                    <div className="flex items-center gap-3 sm:flex-col sm:items-start">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#0b0d0f]">
                        <Image src={step.icon} alt="" className="h-5 w-5 invert" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">Step {step.id}</span>
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-white">{step.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-white/62">{step.detail}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


