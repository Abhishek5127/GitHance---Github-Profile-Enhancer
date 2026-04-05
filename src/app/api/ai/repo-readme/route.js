import { NextResponse } from "next/server";
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import {
  fetchRepositoryFileContext,
  fetchRepositoryReadme,
  fetchRepositorySnapshot,
  normalizeGitHubId,
} from "@/app/lib/repo/fetchRepositorySnapshot";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

const SECTION_LABELS = {
  overview: "Project Overview",
  features: "Features",
  techStack: "Tech Stack",
  installation: "Installation",
  usage: "Usage",
  configuration: "Configuration",
  projectStructure: "Project Structure",
  roadmap: "Roadmap",
  contributing: "Contributing",
  license: "License",
};

const DEFAULT_SECTIONS = {
  overview: true,
  features: true,
  techStack: true,
  installation: true,
  usage: true,
  configuration: true,
  projectStructure: true,
  roadmap: false,
  contributing: true,
  license: true,
};

const SECTION_GUIDANCE = {
  overview:
    "Explain what the project does, the problem it solves, and who it serves using repository evidence.",
  features:
    "List the main capabilities as concise bullets. Mention only features supported by repository files or the existing README.",
  techStack:
    "Call out the core languages, frameworks, tooling, services, or infrastructure actually visible in the repository.",
  installation:
    "Provide setup steps only when commands, package managers, or environment expectations are clearly evidenced.",
  usage:
    "Show practical ways to run or use the project when scripts, commands, routes, or workflows are supported by evidence.",
  configuration:
    "Document environment variables, config files, flags, or deployment settings only when they are explicitly present.",
  projectStructure:
    "Summarize the important folders or files so a maintainer can understand the codebase faster.",
  roadmap:
    "Include only if the existing README or repository evidence points to upcoming work, TODOs, or project direction.",
  contributing:
    "Explain contribution expectations when repository files or existing README content support them.",
  license:
    "Mention the license only when a license file, repository metadata, or existing README confirms it.",
};

function jsonError(status, error) {
  return NextResponse.json({ success: false, error }, { status });
}

function sanitizeText(value, maxLength = 500) {
  return String(value || "").trim().slice(0, maxLength);
}

function sanitizePromptOptions(options = {}, repoName = "") {
  const rawSections =
    options && typeof options.sections === "object" ? options.sections : {};

  const sections = Object.fromEntries(
    Object.keys(DEFAULT_SECTIONS).map((key) => {
      if (Object.prototype.hasOwnProperty.call(rawSections, key)) {
        return [key, Boolean(rawSections[key])];
      }
      return [key, DEFAULT_SECTIONS[key]];
    })
  );

  return {
    title: sanitizeText(options?.title || repoName, 120) || repoName,
    tone: sanitizeText(options?.tone || "developer-friendly", 40) || "developer-friendly",
    targetAudience: sanitizeText(options?.targetAudience || "", 160),
    customNotes: sanitizeText(options?.customNotes || "", 700),
    sections,
  };
}

function enabledSectionLabels(sections) {
  return Object.entries(sections || {})
    .filter(([, enabled]) => Boolean(enabled))
    .map(([key]) => SECTION_LABELS[key] || key);
}

function buildSectionGuidance(sections = {}) {
  const enabledEntries = Object.entries(sections).filter(([, enabled]) => Boolean(enabled));
  if (!enabledEntries.length) {
    return "- Use the essential sections that are clearly supported by repository evidence.";
  }

  return enabledEntries
    .map(
      ([key]) =>
        `- ${SECTION_LABELS[key] || key}: ${
          SECTION_GUIDANCE[key] || "Cover this section only if repository evidence supports it."
        }`
    )
    .join("\n");
}

function buildRepositorySignals(repoInfo = {}) {
  return [
    `- Description: ${repoInfo?.description || "N/A"}`,
    `- Primary language: ${repoInfo?.language || "Unknown"}`,
    `- Topics: ${(repoInfo?.topics || []).join(", ") || "None"}`,
    `- Homepage: ${repoInfo?.homepage || "None"}`,
    `- License: ${repoInfo?.license?.name || "Not detected"}`,
    `- Visibility: ${repoInfo?.visibility || "unknown"}`,
    `- Stars: ${Number(repoInfo?.stargazers_count || 0)}`,
    `- Forks: ${Number(repoInfo?.forks_count || 0)}`,
    `- Open issues: ${Number(repoInfo?.open_issues_count || 0)}`,
  ].join("\n");
}

function sanitizeGeneratedReadme(value, fallbackTitle) {
  const cleaned = String(value || "")
    .replace(/```markdown/g, "")
    .replace(/```md/g, "")
    .replace(/```/g, "")
    .replace(/^here(?:'s| is)\s+your\s+readme:?/gim, "")
    .replace(/^readme:?/gim, "")
    .replace(/^#+\s*readme\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!cleaned) return "";
  if (/^#\s+/m.test(cleaned)) return cleaned;
  return `# ${fallbackTitle || "README"}\n\n${cleaned}`;
}

function buildUserPrompt({
  owner,
  repo,
  branch,
  repoInfo,
  tree,
  relevantFiles,
  fileContexts,
  existingReadme,
  mode,
  options,
}) {
  const sectionList = enabledSectionLabels(options.sections);
  const treePreview = tree
    .filter((item) => item.type === "file")
    .slice(0, 80)
    .map((item) => `- ${item.path}`)
    .join("\n");
  const importantFiles = relevantFiles.map((item) => `- ${item.path}`).join("\n");
  const contextBlocks = fileContexts
    .map(
      (item) =>
        `### ${item.path}\n\
\`\`\`\n${String(item.content || "").trim()}\n\`\`\``
    )
    .join("\n\n");
  const sectionGuidance = buildSectionGuidance(options.sections);
  const repoSignals = buildRepositorySignals(repoInfo);

  return `
README Assignment
- Mode: ${mode === "improve" ? "Improve an existing README" : "Create a new README"}
- Repository: ${owner}/${repo}
- Default branch: ${branch}
- Title to use: ${options.title || repoInfo?.name || repo}
- Tone: ${options.tone}
- Target audience: ${options.targetAudience || "General developers"}
- Requested sections: ${sectionList.join(", ") || "Use the essentials only"}
- Extra notes: ${options.customNotes || "None"}

Verified repository signals:
${repoSignals}

Important repository files:
${importantFiles || "- No relevant files detected"}

Repository tree preview:
${treePreview || "- No files detected"}

Repository evidence excerpts:
${contextBlocks || "No file excerpts available"}

Existing README:
${existingReadme ? existingReadme : "No existing README was found."}

Section guidance:
${sectionGuidance}

Output contract:
- Return markdown only.
- Start with a single H1 title.
- Open with a concise 2-4 line overview that explains the repository quickly.
- Use clean GitHub-native formatting: short paragraphs, bullets for capabilities, and code fences only when evidence supports exact commands.
- Keep section order intuitive and omit any section that is not supported by evidence.
- Preserve valuable details from the existing README when they are still accurate.
- Do not invent scripts, environment variables, commands, URLs, features, benchmarks, or roadmap items.
- If evidence is weak, keep wording neutral and skip unsupported implementation details.
`;
}

const SYSTEM_PROMPT = `
You are GitHance, a senior technical writer who creates polished GitHub README files for real software repositories.

Your README output should feel production-ready, scannable, and grounded in evidence from the repository.

Quality bar:
- Lead with clarity and value, not filler.
- Prefer crisp GitHub-native structure over generic marketing copy.
- Use short paragraphs, bullet lists, and code fences deliberately.
- Make it easy for a developer to understand what the project is, how it works, and how to get started.

Hard rules:
- Never invent facts, setup steps, commands, routes, scripts, environment variables, URLs, licenses, or roadmap items.
- Reuse and improve accurate details from the existing README when they are supported by repository evidence.
- If evidence for a section is weak, omit the section or keep the wording cautious and high-level.
- Keep the tone aligned to the requested style while staying credible and specific.
- Return markdown only.
`;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const owner = normalizeGitHubId(body?.owner).toLowerCase();
    const repo = normalizeGitHubId(body?.repo || body?.reponame);
    const mode = body?.mode === "improve" ? "improve" : "create";
    const accessToken = String(
      process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GH_TOKEN || ""
    ).trim();

    if (!owner) {
      return jsonError(400, "Repository owner is required");
    }

    if (!repo) {
      return jsonError(400, "Repository name is required");
    }

    const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();
    if (!apiKey) {
      return jsonError(500, "OPENROUTER_API_KEY is not configured");
    }

    const { repoInfo, branch, tree } = await fetchRepositorySnapshot({
      owner,
      repo,
      token: accessToken,
      maxTreeItems: 6000,
    });

    const repoReadme = await fetchRepositoryReadme({
      owner,
      repo,
      token: accessToken,
    });

    const workingReadme = sanitizeText(
      body?.currentReadme ?? repoReadme.content,
      15000
    );
    const promptOptions = sanitizePromptOptions(body?.options, repoInfo?.name || repo);

    const relevantFiles = getRelevantFiles(tree, { maxFiles: 24 }).filter(
      (item) => item.path !== repoReadme.path
    );

    const fileContexts = (
      await Promise.all(
        relevantFiles.slice(0, 8).map((item) =>
          fetchRepositoryFileContext({
            owner,
            repo,
            path: item.path,
            ref: branch,
            token: accessToken,
            maxBytes: 120_000,
            maxChars: 4_500,
          })
        )
      )
    ).filter((item) => item && item.content);

    const userPrompt = buildUserPrompt({
      owner,
      repo,
      branch,
      repoInfo,
      tree,
      relevantFiles: relevantFiles.slice(0, 20),
      fileContexts,
      existingReadme: workingReadme,
      mode,
      options: promptOptions,
    });

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "GitHance",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return jsonError(
        502,
        payload?.error?.message || payload?.message || "Failed to generate README"
      );
    }

    const rawReadme =
      payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";
    const readme = sanitizeGeneratedReadme(rawReadme, promptOptions.title || repoInfo?.name || repo);

    if (!readme) {
      return jsonError(502, "AI returned an empty README");
    }

    return NextResponse.json({
      success: true,
      mode,
      readme,
      repository: repoInfo,
      branch,
      usedFiles: fileContexts.map((item) => item.path),
      generationMeta: {
        requestedTitle: promptOptions.title || repoInfo?.name || repo,
        requestedTone: promptOptions.tone,
        requestedSections: enabledSectionLabels(promptOptions.sections),
        usedFiles: fileContexts.map((item) => item.path),
        repositorySignals: {
          language: repoInfo?.language || "",
          topics: Array.isArray(repoInfo?.topics) ? repoInfo.topics.slice(0, 6) : [],
          homepage: repoInfo?.homepage || "",
          license: repoInfo?.license?.name || "",
        },
      },
    });
  } catch (error) {
    return jsonError(error?.status || 500, error?.message || "Failed to build repository README");
  }
}
