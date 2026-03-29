import dynamic from "next/dynamic";
import LandingNav from "./components/landing/LandingNav";
import Hero from "./components/landing/Hero";
import Workflow from "./components/landing/Workflow";
import Footer from "./components/landing/Footer";
import FaqSection, { HOME_FAQS } from "./components/landing/FaqSection";
import InternalLinksSection from "./components/landing/InternalLinksSection";
import LandingFeedbackWidget from "./components/landing/LandingFeedbackWidget";
import JsonLd from "./components/seo/JsonLd";
import {
  buildMetadata,
  createFaqSchema,
  createOrganizationSchema,
  createSoftwareApplicationSchema,
  createWebsiteSchema,
} from "./lib/seo";

const Highlights = dynamic(() => import("./components/landing/Highlights"));
const FeatureGrid = dynamic(() => import("./components/landing/FeatureGrid"));
const HowItWorks = dynamic(() => import("./components/landing/HowItWorks"));

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "GitHub README Generator, Profile Builder, and Repository Analyzer",
  description:
    "GitHance is an AI-powered GitHub README generator and developer productivity platform for repository analysis, profile README building, profile comparison, and repository security review.",
  path: "/",
  keywords: [
    "GitHub README generator",
    "GitHub profile builder",
    "repository analyzer",
    "developer productivity software",
    "repository security analysis",
  ],
});

const homeSchemas = [
  createOrganizationSchema(),
  createWebsiteSchema(),
  createSoftwareApplicationSchema({
    name: "GitHance",
    path: "/",
    description:
      "An AI-powered GitHub README generator and developer productivity platform for profile building, repository analysis, security review, and GitHub discoverability.",
    keywords: [
      "GitHub README generator",
      "GitHub profile README builder",
      "repository analyzer",
      "developer productivity tools",
    ],
    featureList: [
      "AI GitHub README generation from repository context",
      "GitHub profile README builder with reusable blocks",
      "Repository analysis and README readiness insights",
      "Repository security analysis and review workflow",
      "Developer profile comparison tools",
    ],
  }),
  createFaqSchema(HOME_FAQS),
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={homeSchemas} />
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.35),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.25),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_60%)] blur-3xl" />
        <LandingNav />
        <main id="main-content">
          <Hero />
          <HowItWorks />
          <Highlights />
          <FeatureGrid />
          <Workflow />
          <InternalLinksSection />
          <FaqSection />
        </main>
      </div>
      <Footer />
      <LandingFeedbackWidget />
    </div>
  );
}


