import Link from "next/link";
import Image from "next/image";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import JsonLd from "../components/seo/JsonLd";
import ReadmeTemplateCarousel from "../components/readmeTemplates/ReadmeTemplateCarousel";
import ServicesSection from "../components/services/ServicesSection";
import { assets } from "../assets/assets";
import { antonio, poppins } from "../fonts";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "../lib/seo";

const servicePillars = [
  {
    title: "Security Analysis",
    detail: "Scan repositories for risky dependencies and vulnerable patterns before publishing updates.",
    icon: assets.Secure,
    accent: "text-cyan-100",
  },
  {
    title: "Profile Comparison",
    detail: "Compare GitHub profiles side-by-side to identify strengths, gaps, and momentum opportunities.",
    icon: assets.Impact,
    accent: "text-violet-100",
  },
  {
    title: "README Generator",
    detail: "Generate polished GitHub README files from curated template layouts and repository context.",
    icon: assets.Repair,
    accent: "text-blue-100",
  },
  {
    title: "GitHub-style Preview",
    detail: "Inspect the final README exactly how it will render on GitHub before you copy or download it.",
    icon: assets.AutoUpdate,
    accent: "text-emerald-100",
  },
];

const productFlow = [
  {
    id: "01",
    title: "Analyze",
    detail: "Run repository and security analysis to capture context quickly.",
  },
  {
    id: "02",
    title: "Compare",
    detail: "Benchmark profile quality and find opportunities to improve visibility.",
  },
  {
    id: "03",
    title: "Build",
    detail: "Choose a README template and generate content tailored to your stack.",
  },
  {
    id: "04",
    title: "Export",
    detail: "Open the final preview, then copy or download the README when it is ready.",
  },
];

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "GitHub README Generator Product | AI README Builder",
  description:
    "Explore GitHance: an AI GitHub README generator for repository READMEs, profile README building, markdown preview, repository analysis, and developer visibility.",
  path: "/product",
  keywords: [
    "GitHub README generator",
    "AI GitHub README generator",
    "AI README generator",
    "repository README generator",
    "GitHub README builder",
    "GitHub README template",
    "GitHub profile optimization",
    "repository analysis software",
  ],
});

const schemas = [
  createSoftwareApplicationSchema({
    name: "GitHance Product",
    path: "/product",
    description:
      "GitHance combines AI GitHub README generation, repository security analysis, profile comparison, README templates, and GitHub-style preview/export in one web application.",
    featureList: servicePillars.map((pillar) => pillar.title),
    keywords: [
      "GitHub README generator",
      "AI README generator",
      "repository README generator",
      "developer productivity SaaS",
    ],
  }),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Product", path: "/product" },
  ]),
];

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-[#05080d] text-white">
      <JsonLd data={schemas} />

      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-40 -top-8 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(34,211,238,0.24),_transparent_66%)] blur-3xl" />
        <div className="pointer-events-none absolute -right-20 top-14 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,_rgba(139,92,246,0.2),_transparent_70%)] blur-3xl" />
        <LandingNav pathname="/product" />

        <main
          id="main-content"
          className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-4 lg:pb-20"
        >
          <section className="grid gap-10 lg:grid-cols-[1.02fr_0.98fr] lg:items-center">
            <div>
              <p className={`${poppins.className} text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/80`}>
                Product
              </p>
              <h1 className={`${antonio.className} mt-5 text-5xl leading-[0.95] sm:text-6xl lg:text-7xl`}>
                AI GitHub README generator with templates, preview, and export-ready tooling.
              </h1>
              <p className={`${poppins.className} mt-5 max-w-2xl text-sm leading-7 text-white/68 sm:text-base`}>
                GitHance connects AI README generation, security analysis, profile comparison, and GitHub-style preview/export
                in one product surface so your profile and repositories stay sharp without manual churn.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/profile-builder"
                  className={`${poppins.className} inline-flex items-center justify-center rounded-full bg-cyan-300 px-6 py-3 text-sm font-semibold text-[#081018] transition hover:bg-cyan-200`}
                >
                  Build README
                </Link>
                <Link
                  href="/profile-compare"
                  className={`${poppins.className} inline-flex items-center justify-center rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/85 transition hover:bg-white/10`}
                >
                  Compare Profiles
                </Link>
                <Link
                  href="/analyze"
                  className={`${poppins.className} inline-flex items-center justify-center rounded-full border border-cyan-300/40 px-6 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/15`}
                >
                  Run Security Scan
                </Link>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {servicePillars.map((pillar) => (
                  <article
                    key={pillar.title}
                    className="rounded-2xl border border-white/12 bg-white/[0.03] p-4 backdrop-blur"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/12 bg-[#08121d]">
                        <Image src={pillar.icon} alt="" className="h-4 w-4 invert" />
                      </div>
                      <h2 className={`${antonio.className} text-2xl leading-none ${pillar.accent}`}>{pillar.title}</h2>
                    </div>
                    <p className={`${poppins.className} mt-3 text-xs leading-6 text-white/62 sm:text-sm`}>{pillar.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-cyan-300/20 bg-[#090f18]/80 p-5 shadow-[0_30px_110px_rgba(0,0,0,0.45)] sm:p-6">
              <div className="overflow-hidden rounded-2xl border border-white/12 bg-[#0d1117]">
                <Image
                  src={assets.Highlights}
                  alt="GitHance AI GitHub README generator product preview with profile analytics"
                  className="h-auto w-full"
                  priority
                  sizes="(min-width: 1024px) 46vw, 100vw"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-[#0d1117]/85 px-3 py-2">
                  <p className={`${poppins.className} text-[10px] uppercase tracking-[0.2em] text-cyan-100/80`}>Templates</p>
                  <p className={`${antonio.className} mt-1 text-2xl leading-none text-white`}>8</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#0d1117]/85 px-3 py-2">
                  <p className={`${poppins.className} text-[10px] uppercase tracking-[0.2em] text-violet-100/80`}>Core services</p>
                  <p className={`${antonio.className} mt-1 text-2xl leading-none text-white`}>4</p>
                </div>
              </div>
              <p className={`${poppins.className} mt-4 text-sm leading-6 text-white/62`}>
                Swipe templates, compare profiles, run security checks, and move straight into a GitHub-style README preview
                before export.
              </p>
            </div>
          </section>

          <section className="mt-12 rounded-[28px] border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:p-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <h2 className={`${antonio.className} text-4xl leading-none text-white sm:text-5xl`}>Product Workflow</h2>
              <Link
                href="/profile-builder"
                className={`${poppins.className} inline-flex rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/78 transition hover:bg-white/10`}
              >
                Open Builder
              </Link>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {productFlow.map((step) => (
                <article key={step.id} className="rounded-2xl border border-white/10 bg-[#080d14] p-4">
                  <p className={`${poppins.className} text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-100/75`}>
                    Step {step.id}
                  </p>
                  <h3 className={`${antonio.className} mt-3 text-3xl leading-none text-white`}>{step.title}</h3>
                  <p className={`${poppins.className} mt-3 text-sm leading-6 text-white/62`}>{step.detail}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </div>

      <ReadmeTemplateCarousel />
      <ServicesSection />

      <section className="mx-auto mb-24 mt-8 w-full max-w-7xl px-4 sm:px-6 lg:px-4">
        <div className="rounded-[30px] border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(34,211,238,0.14),rgba(124,58,237,0.14))] p-6 sm:p-8">
          <p className={`${poppins.className} text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100/90`}>
            Ready to Ship
          </p>
          <h2 className={`${antonio.className} mt-4 text-4xl leading-none text-white sm:text-5xl`}>
            Turn any repository into a conversion-ready README.
          </h2>
          <p className={`${poppins.className} mt-4 max-w-2xl text-sm leading-7 text-white/72 sm:text-base`}>
            Choose a template from the carousel, apply profile insights, and export a README that is ready to copy or download as your
            project evolves.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/profile-builder"
              className={`${poppins.className} inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0a1320] transition hover:bg-cyan-100`}
            >
              Open Builder
            </Link>
            <Link
              href="/analyze"
              className={`${poppins.className} inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white/88 transition hover:bg-white/10`}
            >
              Analyze Repository
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}




