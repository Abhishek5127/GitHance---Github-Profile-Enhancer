import JsonLd from "../components/seo/JsonLd";
import PricingClient from "./PricingClient";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createFaqSchema,
  createOfferSchema,
  createProductSchema,
} from "../lib/seo";
import { formatPriceLabel, getProPlanConfig } from "@/app/lib/billing/plans";

const proPlan = getProPlanConfig();

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
    price: String(proPlan.amount),
    priceLabel: formatPriceLabel(proPlan.amount, proPlan.currency),
    cadence: proPlan.cadenceLabel,
    summary: "For maintainers shipping docs across multiple repositories.",
    features: [
      "Profile builder and reusable blocks",
      "Repository insight snapshots",
      "README editing workspace",
      "Basic publishing workflow",
      "Advanced vulnerability repository analysis",
      "Auto-updating README workflows",
      "Compare Profiles",
      "Early Beta-Feature access",
    ],
    cta: "Upgrade to Pro",
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
    priceCurrency: proPlan.currency,
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
    <>
      <JsonLd data={schemas} />
      <PricingClient plans={plans} faqs={PRICING_FAQS} />
    </>
  );
}
