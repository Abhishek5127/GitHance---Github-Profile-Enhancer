import Link from "next/link";
import Image from "next/image";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import { assets } from "../assets/assets";

const productBlocks = [
  {
    title: "Repository Intelligence",
    detail:
      "Surface key files, architecture signals, and documentation gaps before writing a single README section.",
    icon: assets.Analyze,
    tag: "Context First",
  },
  {
    title: "README Composition Studio",
    detail:
      "Build narrative-driven README layouts with reusable blocks that stay aligned to your actual codebase.",
    icon: assets.Repair,
    tag: "Modular",
  },
  {
    title: "Profile Momentum Layer",
    detail:
      "Turn contribution patterns, projects, and technical focus into a profile that communicates direction.",
    icon: assets.Activity,
    tag: "Signal Rich",
  },
];

const outcomes = [
  "Faster onboarding for new contributors",
  "Cleaner handoff between development and docs",
  "More confident publishing across repositories",
  "Consistent GitHub presence across teams",
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-28 top-0 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.24),_transparent_65%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(74,222,128,0.16),_transparent_70%)] blur-3xl" />
        <LandingNav />
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#ffb37f]">Product</p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              One product surface for repository clarity and profile signal.
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              GitHance combines repository analysis, README composition, and profile storytelling into one loop,
              so shipping documentation no longer feels disconnected from development.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/profile-builder"
                className="inline-flex items-center justify-center rounded-full bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]"
              >
                Start Building
              </Link>
              <Link
                href="/analyze"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Explore Analyzer
              </Link>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#12161c] p-5 shadow-[0_35px_110px_rgba(0,0,0,0.45)] sm:p-6">
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d0f]">
              <Image
                src={assets.Highlights}
                alt="GitHance product preview"
                className="h-auto w-full"
                priority
              />
            </div>
            <p className="mt-4 text-sm leading-6 text-white/60">
              Product surfaces stay connected: insight first, composition second, publishing third.
            </p>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          {productBlocks.map((block) => (
            <article
              key={block.title}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                  <Image src={block.icon} alt="" className="h-5 w-5 invert" />
                </div>
                <span className="rounded-full border border-white/10 bg-[#0b0d0f] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb37f]">
                  {block.tag}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{block.title}</h2>
              <p className="mt-3 text-sm leading-6 text-white/62">{block.detail}</p>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-[30px] border border-white/10 bg-[#111418] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">What Changes</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {outcomes.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 px-4 py-3 text-sm text-white/68">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
