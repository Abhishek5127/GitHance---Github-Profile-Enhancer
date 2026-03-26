import RepositorySecurityClient from "./RepositorySecurityClient";
import { buildMetadata } from "@/app/lib/seo";

export async function generateMetadata({ params }) {
  const { reponame } = await params;
  const repoName = decodeURIComponent(reponame || "repository");

  return buildMetadata({
    title: `${repoName} Repository Security Analysis`,
    description:
      "Review repository security findings, risk signals, and code-level analysis for a GitHub repository inside GitHance.",
    path: `/repository-security/${encodeURIComponent(repoName)}`,
    keywords: ["repository security analysis", "GitHub security scan", repoName],
    noIndex: true,
  });
}

export default async function Page({ params }) {
  const { reponame } = await params;
  return <RepositorySecurityClient reponame={reponame} />;
}

