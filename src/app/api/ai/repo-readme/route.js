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

function sanitizeGeneratedReadme(value, fallbackTitle) {
  const cleaned = String(value || "")
    .replace(/```markdown/g, "")
    .replace(/```md/g, "")
    .replace(/```/g, "")
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

  return `
Mode: ${mode === "improve" ? "Improve an existing README" : "Create a new README"}

Repository:
- Owner: ${owner}
- Repo: ${repo}
- Default branch: ${branch}
- Description: ${repoInfo?.description || "N/A"}
- Primary language: ${repoInfo?.language || "Unknown"}
- Topics: ${(repoInfo?.topics || []).join(", ") || "None"}
- Homepage: ${repoInfo?.homepage || "None"}
- Visibility: ${repoInfo?.visibility || "unknown"}

Writer Settings:
- Title: ${options.title || repoInfo?.name || repo}
- Tone: ${options.tone}
- Target audience: ${options.targetAudience || "General developers"}
- Sections to include: ${sectionList.join(", ") || "Use the essentials only"}
- Extra notes: ${options.customNotes || "None"}

Important repository files:
${importantFiles || "- No relevant files detected"}

Repository tree preview:
${treePreview || "- No files detected"}

Evidence from repository files:
${contextBlocks || "No file excerpts available"}

Existing README:
${existingReadme ? existingReadme : "No existing README was found."}

Output rules:
- Return markdown only.
- Do not invent scripts, environment variables, commands, URLs, or features.
- If evidence is weak, keep wording neutral and omit uncertain details.
- Start with a single H1 title.
- Keep the README concise but genuinely useful.
- Prefer sections that are supported by repo evidence.
- Include setup and usage guidance only when the repository evidence supports them.
- If there is no license evidence, do not fabricate one.
`;
}

const SYSTEM_PROMPT = `
You are GitHance, an expert technical writer for software repositories.

Your job is to write accurate, high-quality README markdown using repository evidence.

Rules:
- Never invent facts.
- Never invent environment variables, package scripts, endpoints, or setup steps.
- Preserve strong details from the existing README when they are supported.
- Improve structure, clarity, and discoverability.
- Prefer concise, confident documentation over filler.
- Return only markdown.
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
        temperature: 0.25,
        max_tokens: 1400,
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
    });
  } catch (error) {
    return jsonError(error?.status || 500, error?.message || "Failed to build repository README");
  }
}
