import Link from "next/link";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import JsonLd from "../components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createFaqSchema,
  createOfferSchema,
  createProductSchema,
} from "../lib/seo";

const plans = [
  {
    name: "Starter",
    price: "0",
    priceLabel: "$0",
    cadence: "/month",
    summary: "For solo developers polishing profile and README flow.",
    features: [
      "Profile builder and reusable blocks",
      "Repository insight snapshots",
      "README editing workspace",
      "Basic publishing workflow",
    ],
    cta: "Start Starter",
    accent: "border-white/10 bg-[#12161c]",
  },
  {
    name: "Pro",
    price: "5",
    priceLabel: "$5",
    cadence: "/month",
    summary: "For maintainers shipping docs across multiple repositories.",
    features: [
      "Profile builder and reusable blocks",
      "Repository insight snapshots",
      "README editing workspace",
      "Basic publishing workflow",
      "Advanced vulnerability repository analysis",
      "Auto Updates elements in intervals",
      "Compare Profiles",
      "Early Beta-Feature access",
    ],
    cta: "Choose Pro",
    accent: "border-[#ff7a1a]/40 bg-[linear-gradient(180deg,rgba(255,122,26,0.14),rgba(18,22,28,1))]",
    featured: true,
  },
];

export const PRICING_FAQS = [
  {
    question: "Can we start free before choosing a plan?",
    answer:
      "Yes. GitHance offers a free starting point so developers can test profile building, repository preview, and README workflows before upgrading.",
  },
  {
    question: "Do plans include repository analysis features?",
    answer:
      "Yes. Paid plans include repository analysis features, with more depth for maintainers and teams who need README, profile, and security workflows together.",
  },
  {
    question: "Can we switch plans later?",
    answer:
      "Absolutely. You can move between tiers as repository count, team size, or workflow needs change.",
  },
];

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "Pricing for GitHub README and Developer Productivity Workflows",
  description:
    "Review GitHance pricing for GitHub README generation, repository analysis, profile building, and developer productivity workflows for individuals and teams.",
  path: "/pricing",
  keywords: [
    "README generator pricing",
    "GitHub tool pricing",
    "developer productivity SaaS pricing",
    "repository analysis software pricing",
  ],
});

const offerSchemas = plans.map((plan) =>
  createOfferSchema({
    name: `GitHance ${plan.name}`,
    description: plan.summary,
    price: plan.price,
    path: `/pricing#${plan.name.toLowerCase()}`,
  })
);

const schemas = [
  createProductSchema({
    name: "GitHance Pricing",
    description:
      "Pricing for GitHance GitHub README generation, repository analysis, and profile optimization workflows.",
    path: "/pricing",
    offers: offerSchemas,
  }),
  createFaqSchema(PRICING_FAQS),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Pricing", path: "/pricing" },
  ]),
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={schemas} />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.2),_transparent_70%)] blur-3xl" />
        <LandingNav />
      </div>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">Pricing</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Choose the plan that matches your GitHub visibility and documentation goals.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Scale from individual profile polishing to team-wide documentation quality without changing tools.
          </p>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <article
              id={plan.name.toLowerCase()}
              key={plan.name}
              className={`rounded-[30px] border p-6 shadow-[0_26px_90px_rgba(0,0,0,0.3)] sm:p-7 ${plan.accent}`}
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
                {plan.featured ? (
                  <span className="rounded-full border border-[#ff7a1a]/35 bg-[#ff7a1a]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb37f]">
                    Most Popular
                  </span>
                ) : null}
              </div>
              <div className="mt-4 flex items-end gap-2">
                <div className="text-4xl font-semibold text-white sm:text-5xl">{plan.priceLabel}</div>
                <div className="pb-1 text-sm text-white/60">{plan.cadence}</div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/65">{plan.summary}</p>

              <ul className="mt-5 space-y-2 text-sm text-white/72">
                {plan.features.map((feature) => (
                  <li key={feature} className="rounded-xl border border-white/10 bg-[#0b0d0f]/70 px-3 py-2">
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/profile-builder"
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                {plan.cta}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-[30px] border border-white/10 bg-[#111418] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-semibold text-white">FAQ</h2>
            <Link
              href="/profile-builder"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Start Free Workspace
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {PRICING_FAQS.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 p-4">
                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

