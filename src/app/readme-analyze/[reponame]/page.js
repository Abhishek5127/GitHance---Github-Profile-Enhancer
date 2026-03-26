import ReadmeClient from "./ReadmeClient";
import { buildMetadata } from "@/app/lib/seo";

export async function generateMetadata({ params }) {
  const { reponame } = await params;
  const repoName = decodeURIComponent(reponame || "repository");

  return buildMetadata({
    title: `${repoName} README Workspace`,
    description:
      "Generate, refine, and preview a repository README from GitHub context inside the GitHance README workspace.",
    path: `/readme-analyze/${encodeURIComponent(repoName)}`,
    keywords: ["repository README workspace", "README generator", repoName],
    noIndex: true,
  });
}

export default async function Page({ params }) {
  const { reponame } = await params;
  return <ReadmeClient reponame={reponame} />;
}

