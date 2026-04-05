import AnalyzeClient from "./AnalyzeClient";
import JsonLd from "@/app/components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "@/app/lib/seo";

export const metadata = buildMetadata({
  title: "GitHub Repository Analyzer and README Preview",
  description:
    "Preview your current GitHub repositories, see README readiness, and launch README generation or repository security analysis from one searchable workspace.",
  path: "/analyze",
  keywords: [
    "GitHub repository analyzer",
    "repository preview tool",
    "README preview",
    "repository security scanner",
  ],
});

const analyzeSchema = createSoftwareApplicationSchema({
  name: "GitHance Repository Analyzer",
  path: "/analyze",
  description:
    "A GitHub repository analyzer that previews repositories, checks README coverage, and launches README creation or security analysis from one workspace.",
  keywords: [
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

export default function AnalyzePage() {
  return (
    <>
      <JsonLd data={[analyzeSchema, breadcrumbSchema]} />
      <AnalyzeClient />
    </>
  );
}

