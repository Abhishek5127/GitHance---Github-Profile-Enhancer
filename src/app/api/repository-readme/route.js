import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
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
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const ownerFromSession = normalizeGitHubId(
      session?.username || session?.user?.name || ""
    ).toLowerCase();
    const accessToken = String(session?.accessToken || "").trim();

    if (!ownerFromSession || !accessToken) {
      return jsonError(401, "Missing GitHub session. Please sign in again.");
    }

    const body = await request.json().catch(() => ({}));
    const owner = normalizeGitHubId(body?.owner || ownerFromSession).toLowerCase();
    const repo = normalizeGitHubId(body?.repo || body?.reponame);

    if (!repo) {
      return jsonError(400, "Repository name is required");
    }

    if (owner !== ownerFromSession) {
      return jsonError(403, "You can only inspect repositories from your authenticated account");
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
