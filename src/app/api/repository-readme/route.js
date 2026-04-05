import { NextResponse } from "next/server";
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import {
  fetchRepositoryReadme,
  fetchRepositorySnapshot,
  normalizeGitHubId,
} from "@/app/lib/repo/fetchRepositorySnapshot";
import { analyzeReadme } from "@/app/lib/readme/analyzeReadme";

function jsonError(status, error) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const owner = normalizeGitHubId(body?.owner).toLowerCase();
    const repo = normalizeGitHubId(body?.repo || body?.reponame);
    const accessToken = String(
      process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GH_TOKEN || ""
    ).trim();

    if (!owner) {
      return jsonError(400, "Repository owner is required");
    }

    if (!repo) {
      return jsonError(400, "Repository name is required");
    }

    const { repoInfo, branch, tree } = await fetchRepositorySnapshot({
      owner,
      repo,
      token: accessToken,
      maxTreeItems: 6000,
    });

    const readme = await fetchRepositoryReadme({
      owner,
      repo,
      token: accessToken,
    });

    const relevantFiles = getRelevantFiles(tree, { maxFiles: 40 });
    const readmeAnalysis = analyzeReadme(readme.content, {
      repoName: repoInfo.name,
      repoDescription: repoInfo.description,
    });

    return NextResponse.json({
      success: true,
      owner,
      repo,
      branch,
      repository: repoInfo,
      tree,
      relevantFiles,
      readme,
      readmeAnalysis,
    });
  } catch (error) {
    return jsonError(error?.status || 500, error?.message || "Failed to analyze repository README");
  }
}
