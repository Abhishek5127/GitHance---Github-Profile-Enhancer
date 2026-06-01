import dynamic from "next/dynamic";
import LandingNav from "./components/landing/LandingNav";
import Hero from "./components/landing/Hero";
import Workflow from "./components/landing/Workflow";
import Footer from "./components/landing/Footer";
import FaqSection, { HOME_FAQS } from "./components/landing/FaqSection";
import InternalLinksSection from "./components/landing/InternalLinksSection";
import { LandingFeatureGateProvider } from "./components/landing/LandingFeatureGate";
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
const LandingFeedbackWidget = dynamic(() => import("./components/landing/LandingFeedbackWidget"));
const LandingSupportWidget = dynamic(() => import("./components/landing/LandingSupportWidget"));

export const revalidate = 86400;

export const metadata = buildMetadata({
  title: "GitHub README Generator | AI README Builder for GitHub",
  description:
    "Generate GitHub READMEs with AI. GitHance helps developers create repository READMEs, profile READMEs, markdown previews, and GitHub documentation from repository context.",
  path: "/",
  keywords: [
    "GitHub README generator",
    "AI GitHub README generator",
    "GitHub profile builder",
    "GitHub profile README generator",
    "repository README generator",
    "markdown README generator",
    "GitHub README template",
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
      "An AI-powered GitHub README generator for creating repository READMEs, profile READMEs, markdown previews, repository analysis, security review, and GitHub discoverability.",
    keywords: [
      "GitHub README generator",
      "AI GitHub README generator",
      "GitHub profile README builder",
      "repository README generator",
      "markdown README generator",
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

function DeferredSection({ children, intrinsicSize = "960px" }) {
  return (
    <div
      className="overflow-clip"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: intrinsicSize,
      }}
    >
      {children}
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <JsonLd data={homeSchemas} />
      <LandingFeatureGateProvider>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.35),_transparent_60%)] blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.25),_transparent_60%)] blur-3xl" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_60%)] blur-3xl" />
          <LandingNav />
          <main id="main-content">
            <Hero />
            <DeferredSection intrinsicSize="900px">
              <HowItWorks />
            </DeferredSection>
            <DeferredSection intrinsicSize="820px">
              <Highlights />
            </DeferredSection>
            <DeferredSection intrinsicSize="980px">
              <FeatureGrid />
            </DeferredSection>
            <DeferredSection intrinsicSize="760px">
              <Workflow />
            </DeferredSection>
            <DeferredSection intrinsicSize="560px">
              <InternalLinksSection />
            </DeferredSection>
            <DeferredSection intrinsicSize="720px">
              <FaqSection />
            </DeferredSection>
          </main>
        </div>
        <Footer />
      </LandingFeatureGateProvider>
      <LandingFeedbackWidget />
      <LandingSupportWidget />
    </div>
  );
}
