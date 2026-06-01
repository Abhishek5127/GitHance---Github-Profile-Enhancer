import Link from "next/link";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import JsonLd from "../components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createFaqSchema,
  createHowToSchema,
  createSoftwareApplicationSchema,
} from "../lib/seo";

const pageFaqs = [
  {
    question: "What is the GitHance GitHub README generator?",
    answer:
      "GitHance is an AI GitHub README generator that helps developers turn repository context into clearer README markdown, then preview and export the result for GitHub.",
  },
  {
    question: "Can I generate a README from a GitHub repository?",
    answer:
      "Yes. Start from the repository analyzer, choose the repository you want to improve, and use the README workflow to create documentation grounded in the project structure.",
  },
  {
    question: "Does GitHance support GitHub profile READMEs?",
    answer:
      "Yes. GitHance includes a separate profile README builder with reusable sections, tech stack blocks, contribution visuals, and export-ready markdown.",
  },
  {
    question: "Is this only a README template tool?",
    answer:
      "No. Templates are part of the workflow, but GitHance also uses repository analysis, markdown preview, and profile tooling so the README is shaped around the actual project.",
  },
];

const steps = [
  {
    title: "Enter a GitHub username",
    detail:
      "Start with a public GitHub username so GitHance can show the repositories and profile surfaces connected to that account.",
  },
  {
    title: "Analyze the repository",
    detail:
      "Review repository context, README readiness, and project signals before generating new documentation.",
  },
  {
    title: "Generate README markdown",
    detail:
      "Create a GitHub-ready README with sections for overview, setup, usage, tech stack, project structure, and contribution details.",
  },
  {
    title: "Preview and export",
    detail:
      "Check the README in a GitHub-style markdown preview, then copy or download the final markdown.",
  },
];

const featureBlocks = [
  {
    title: "Repository README generator",
    copy:
      "Create README markdown for public GitHub repositories using project context instead of starting from a blank editor.",
  },
  {
    title: "GitHub markdown preview",
    copy:
      "Review headings, lists, tables, badges, and section flow before publishing the README to GitHub.",
  },
  {
    title: "Profile README builder",
    copy:
      "Build a polished GitHub profile README with reusable blocks, tech stacks, contribution widgets, and social sections.",
  },
  {
    title: "Repository analysis",
    copy:
      "Inspect repository signals, documentation gaps, and security review paths from the same workspace.",
  },
];

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "GitHub README Generator | Free AI README Builder",
  description:
    "Use GitHance as a GitHub README generator to create repository READMEs, profile READMEs, markdown previews, and export-ready README content from GitHub context.",
  path: "/github-readme-generator",
  keywords: [
    "GitHub README generator",
    "free GitHub README generator",
    "AI GitHub README generator",
    "README generator for GitHub",
    "repository README generator",
    "GitHub profile README generator",
    "GitHub markdown preview",
  ],
});

const schemas = [
  createSoftwareApplicationSchema({
    name: "GitHance GitHub README Generator",
    path: "/github-readme-generator",
    description:
      "An AI GitHub README generator for creating repository READMEs, profile READMEs, markdown previews, and export-ready documentation.",
    keywords: [
      "GitHub README generator",
      "AI GitHub README generator",
      "repository README generator",
      "GitHub profile README generator",
    ],
    featureList: featureBlocks.map((feature) => feature.title),
  }),
  createHowToSchema({
    name: "How to generate a GitHub README with GitHance",
    description:
      "Generate GitHub README markdown from repository context, preview it, and export it for GitHub.",
    path: "/github-readme-generator",
    steps,
  }),
  createFaqSchema(pageFaqs),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "GitHub README Generator", path: "/github-readme-generator" },
  ]),
];

export default function GitHubReadmeGeneratorPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={schemas} />
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-28 top-12 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.24),_transparent_68%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.2),_transparent_70%)] blur-3xl" />
        <LandingNav pathname="/github-readme-generator" />

        <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-20 pt-12 sm:px-6 lg:px-4">
          <section className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">
                GitHub README Generator
              </p>
              <h1 className="mt-5 max-w-4xl text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Generate GitHub READMEs from repository context, then preview and export markdown.
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                GitHance helps developers create repository READMEs, profile READMEs, and GitHub-ready markdown with AI-assisted context, reusable sections, and a focused preview workflow.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/analyze"
                  className="inline-flex items-center justify-center rounded-full bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]"
                >
                  Generate a README
                </Link>
                <Link
                  href="/profile-builder"
                  className="inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10"
                >
                  Build profile README
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-[#111418]/88 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/80">
                README workflow
              </p>
              <div className="mt-5 grid gap-3">
                {steps.map((step, index) => (
                  <article key={step.title} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">
                      Step {index + 1}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-white">{step.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/62">{step.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/80">Features</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Everything a GitHub README generator should cover.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/64 sm:text-base">
                The goal is not just to output markdown. A good README generator should help developers understand what to write, how it will look on GitHub, and where the repository still needs clarity.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {featureBlocks.map((feature) => (
                <article key={feature.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/64">{feature.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-14 grid gap-6 rounded-[28px] border border-white/10 bg-[#111418] p-6 lg:grid-cols-[0.8fr_1.2fr] lg:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ffb37f]">FAQ</p>
              <h2 className="mt-4 text-3xl font-semibold text-white">Common README generator questions.</h2>
            </div>
            <div className="grid gap-4">
              {pageFaqs.map((faq) => (
                <article key={faq.question} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/70 p-5">
                  <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/64">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
