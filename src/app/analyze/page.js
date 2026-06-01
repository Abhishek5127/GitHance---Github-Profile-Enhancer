import AnalyzeClient from "./AnalyzeClient";
import LandingNav from "../components/landing/LandingNav";
import JsonLd from "@/app/components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "@/app/lib/seo";

export const metadata = buildMetadata({
  title: "Repository README Generator and GitHub Analyzer",
  description:
    "Analyze GitHub repositories, check README readiness, and launch an AI repository README generator with GitHub markdown preview and security analysis.",
  path: "/analyze",
  keywords: [
    "repository README generator",
    "GitHub README generator",
    "GitHub repository analyzer",
    "AI README generator",
    "repository preview tool",
    "README preview",
    "GitHub markdown preview",
    "repository security scanner",
  ],
});

const analyzeSchema = createSoftwareApplicationSchema({
  name: "GitHance Repository Analyzer",
  path: "/analyze",
  description:
    "A GitHub repository analyzer that previews repositories, checks README coverage, and launches AI README creation or security analysis from one workspace.",
  keywords: [
    "repository README generator",
    "GitHub README generator",
    "GitHub repository analyzer",
    "repository README checker",
    "README preview workspace",
  ],
  featureList: [
    "Repository preview for current GitHub repositories",
    "README readiness badges and filters",
    "Security analysis launch links",
    "Public repository analysis and README generation",
  ],
});

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Repository Analyzer", path: "/analyze" },
]);

export default async function AnalyzePage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const initialUsername = String(resolvedSearchParams?.username || "").trim();

  return (
    <>
      <JsonLd data={[analyzeSchema, breadcrumbSchema]} />
      <AnalyzeClient initialUsername={initialUsername}>
        <LandingNav pathname="/analyze" />
      </AnalyzeClient>
    </>
  );
}
