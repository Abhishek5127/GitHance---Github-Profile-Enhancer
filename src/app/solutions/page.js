import Link from "next/link";
import Image from "next/image";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import JsonLd from "../components/seo/JsonLd";
import { assets } from "../assets/assets";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createCollectionPageSchema,
  createItemListSchema,
} from "../lib/seo";

const solutionTracks = [
  {
    title: "Profile Craft",
    summary: "Design a GitHub profile that shows direction, depth, and consistency.",
    items: ["Section-based profile composition", "Contribution signal storytelling", "Visual identity alignment"],
    href: "/profile-builder",
    icon: assets.Impact,
    accent: "text-[#ffb37f]",
  },
  {
    title: "README Systems",
    summary: "Generate and refine README structures tied to repository context, not templates alone.",
    items: ["Context-guided section generation", "Clarity on setup and usage", "Faster documentation iteration"],
    href: "/analyze",
    icon: assets.Repair,
    accent: "text-emerald-300",
  },
  {
    title: "Insight Engine",
    summary: "Analyze repositories to uncover structure, key files, and improvement opportunities.",
    items: ["Relevant file prioritization", "Architecture visibility", "Actionable quality signals"],
    href: "/analyze",
    icon: assets.Analyze,
    accent: "text-cyan-300",
  },
];

const whoItsFor = [
  "Indie developers polishing personal repositories",
  "Open-source maintainers improving contributor onboarding",
  "Teams standardizing README quality across services",
  "Developer advocates curating strong public profiles",
];

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "Solutions for GitHub README Workflows and Developer Visibility",
  description:
    "See how GitHance supports GitHub profile optimization, README generation, repository analysis, and developer discoverability across solo, open-source, and team workflows.",
  path: "/solutions",
  keywords: [
    "GitHub README tools",
    "developer visibility platform",
    "open source documentation tools",
    "GitHub profile optimizer",
  ],
});

const schemas = [
  createCollectionPageSchema({
    name: "GitHance Solutions",
    description:
      "GitHance solutions for GitHub profile optimization, README generation, and repository analysis.",
    path: "/solutions",
  }),
  createItemListSchema({
    name: "GitHance Solution Tracks",
    path: "/solutions",
    items: solutionTracks.map((track) => ({
      name: track.title,
      description: track.summary,
      path: track.href,
    })),
  }),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Solutions", path: "/solutions" },
  ]),
];

export default function SolutionsPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={schemas} />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-8 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.22),_transparent_65%)] blur-3xl" />
        <LandingNav pathname="/solutions" />
      </div>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="rounded-[32px] border border-white/10 bg-[#101418]/95 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[#ffb37f]">Solutions</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Choose the GitHub improvement path that matches where your developer presence needs work first.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Each GitHance solution can stand alone, but they connect into the same workflow so profile, README, and repository analysis stay in sync.
          </p>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-3">
          {solutionTracks.map((track) => (
            <article
              key={track.title}
              className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.3)]"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/25">
                  <Image src={track.icon} alt="" className="h-5 w-5 invert" />
                </div>
                <span className={`text-xs font-semibold uppercase tracking-[0.24em] ${track.accent}`}>{track.title}</span>
              </div>
              <p className="mt-5 text-sm leading-6 text-white/65">{track.summary}</p>
              <ul className="mt-5 space-y-2 text-sm text-white/70">
                {track.items.map((item) => (
                  <li key={item} className="rounded-xl border border-white/10 bg-[#0b0d0f]/70 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={track.href}
                className="mt-5 inline-flex items-center justify-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
              >
                Open {track.title}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-10 grid gap-6 rounded-[32px] border border-white/10 bg-[#111418] p-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/45">Who It Supports</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Developer teams and individual maintainers can use the same workflow.</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {whoItsFor.map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 px-4 py-3 text-sm text-white/68">
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d0f]">
            <Image
              src={assets.Highlights}
              alt="GitHance solutions preview for repository analysis and README workflows"
              className="h-auto w-full"
              sizes="(min-width: 1024px) 38vw, 92vw"
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}


