const MAX_LIBRARY_ITEMS = 24;
const MAX_SCRIPT_ITEMS = 20;

export const REPO_MARKDOWN_STYLES = [
  {
    id: "comprehensive",
    title: "Comprehensive",
    description: "Detailed sections with badges and broad project context.",
  },
  {
    id: "clean",
    title: "Clean",
    description: "Balanced documentation with concise, readable sections.",
  },
  {
    id: "minimal",
    title: "Minimal",
    description: "Lightweight layout focused on quick onboarding.",
  },
];

export const REPO_SECTION_DEFINITIONS = [
  {
    id: "overview",
    title: "Overview",
    description: "Project purpose and high-level value.",
    defaultEnabled: true,
  },
  {
    id: "architecture",
    title: "Architecture",
    description: "How the repository is structured.",
    defaultEnabled: true,
  },
  {
    id: "how_it_works",
    title: "How It Works",
    description: "Execution flow and major runtime behavior.",
    defaultEnabled: true,
  },
  {
    id: "libraries",
    title: "Libraries Used",
    description: "Core frameworks and dependencies.",
    defaultEnabled: true,
  },
  {
    id: "scripts",
    title: "Scripts",
    description: "Useful development and runtime commands.",
    defaultEnabled: true,
  },
  {
    id: "installation",
    title: "Installation",
    description: "How to set up the project locally.",
    defaultEnabled: true,
  },
  {
    id: "usage",
    title: "Usage",
    description: "How to run and use the project.",
    defaultEnabled: true,
  },
  {
    id: "api_reference",
    title: "API Reference",
    description: "Detected API surfaces and integration notes.",
    defaultEnabled: true,
  },
  {
    id: "live_status",
    title: "Live Status",
    description: "Live deployment state and important links.",
    defaultEnabled: true,
  },
  {
    id: "roadmap",
    title: "Roadmap",
    description: "Future direction and planned improvements.",
    defaultEnabled: true,
  },
  {
    id: "contributing",
    title: "Contributing",
    description: "Contribution workflow and expected process.",
    defaultEnabled: true,
  },
  {
    id: "license",
    title: "License",
    description: "Licensing details.",
    defaultEnabled: true,
  },
];

function normalizeText(value) {
  return String(value || "").trim();
}

function uniqueList(values = [], max = 20) {
  const out = [];
  const seen = new Set();

  values.forEach((entry) => {
    const normalized = normalizeText(entry);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });

  return out.slice(0, max);
}

function toBulletList(values = [], max = 10, empty = "- Not available yet") {
  const list = uniqueList(values, max);
  if (!list.length) return empty;
  return list.map((value) => `- ${value}`).join("\n");
}

function detectInstallCommand(context = {}) {
  const packageManagers = Array.isArray(context?.insights?.classification?.package_managers)
    ? context.insights.classification.package_managers
    : [];

  const normalizedManagers = packageManagers.map((value) =>
    String(value || "").trim().toLowerCase()
  );

  if (normalizedManagers.includes("pnpm")) return "pnpm install";
  if (normalizedManagers.includes("yarn")) return "yarn install";
  if (normalizedManagers.includes("bun")) return "bun install";
  if (normalizedManagers.includes("poetry")) return "poetry install";
  if (normalizedManagers.includes("pip")) return "pip install -r requirements.txt";
  if (normalizedManagers.includes("cargo")) return "cargo build";
  if (normalizedManagers.includes("go modules")) return "go mod download";

  return "npm install";
}

function detectRunCommand(context = {}) {
  const scripts = Array.isArray(context?.insights?.runtime?.scripts)
    ? context.insights.runtime.scripts
    : [];
  const commandByName = new Map();

  scripts.forEach((entry) => {
    const name = String(entry?.name || "").trim().toLowerCase();
    const command = normalizeText(entry?.command);
    if (!name || !command || commandByName.has(name)) return;
    commandByName.set(name, command);
  });

  if (commandByName.has("dev")) return "npm run dev";
  if (commandByName.has("start")) return "npm run start";
  if (commandByName.has("serve")) return "npm run serve";
  if (commandByName.has("preview")) return "npm run preview";

  const frameworks = Array.isArray(context?.insights?.libraries?.frameworks)
    ? context.insights.libraries.frameworks
    : [];
  const normalizedFrameworks = frameworks.map((entry) =>
    String(entry || "").trim().toLowerCase()
  );

  if (normalizedFrameworks.includes("next.js")) return "npm run dev";
  if (normalizedFrameworks.includes("react")) return "npm run dev";
  if (normalizedFrameworks.includes("django")) return "python manage.py runserver";
  if (normalizedFrameworks.includes("flask")) return "flask run";
  if (normalizedFrameworks.includes("fastapi")) return "uvicorn main:app --reload";
  if (normalizedFrameworks.includes("go")) return "go run ./...";
  if (normalizedFrameworks.includes("rust")) return "cargo run";

  return "npm run dev";
}

function buildOverviewContent(context = {}) {
  const repo = context?.repository || {};
  const description = normalizeText(repo?.description);
  const topics = uniqueList(repo?.topics || [], 12);
  const primaryLanguages = uniqueList(
    context?.insights?.classification?.primary_languages || [],
    4
  );

  const lines = [];

  if (description) {
    lines.push(description);
  } else {
    lines.push(
      "This repository contains a production-oriented codebase. Update this section with the core problem, users, and value proposition."
    );
  }

  if (topics.length) {
    lines.push("");
    lines.push(`**Topics:** ${topics.map((topic) => `\`${topic}\``).join(", ")}`);
  }

  if (primaryLanguages.length) {
    lines.push(`**Primary Languages:** ${primaryLanguages.join(", ")}`);
  }

  return lines.join("\n");
}

function buildArchitectureContent(context = {}) {
  const structureLines = Array.isArray(context?.insights?.architecture?.structure_preview)
    ? context.insights.architecture.structure_preview
    : [];
  const projectGroups = uniqueList(
    context?.insights?.architecture?.project_groups || [],
    10
  );
  const topDirectories = uniqueList(
    context?.insights?.architecture?.top_level_directories || [],
    12
  );

  const lines = [];
  if (topDirectories.length) {
    lines.push("**Top-Level Directories**");
    lines.push(toBulletList(topDirectories, 12));
    lines.push("");
  }

  if (projectGroups.length) {
    lines.push("**Project Grouping**");
    lines.push(toBulletList(projectGroups, 10));
    lines.push("");
  }

  if (structureLines.length) {
    lines.push("**Structure Snapshot**");
    lines.push("```text");
    structureLines.slice(0, 80).forEach((entry) => lines.push(String(entry)));
    lines.push("```");
  } else {
    lines.push("Add a folder structure snapshot for maintainers and contributors.");
  }

  return lines.join("\n");
}

function buildHowItWorksContent(context = {}) {
  const hints = uniqueList(context?.insights?.how_it_works?.hints || [], 10);
  if (hints.length) {
    return toBulletList(hints, 10);
  }

  return [
    "- Explain the main runtime flow from entry point to output.",
    "- Describe how requests/jobs/events move through the codebase.",
    "- Mention where state is stored and how errors are handled.",
  ].join("\n");
}

function buildLibrariesContent(context = {}) {
  const frameworks = uniqueList(context?.insights?.libraries?.frameworks || [], 10);
  const libraries = uniqueList(context?.insights?.libraries?.detected || [], MAX_LIBRARY_ITEMS);
  const manifests = uniqueList(context?.insights?.libraries?.manifests || [], 12);

  const lines = [];
  if (frameworks.length) {
    lines.push("**Frameworks**");
    lines.push(toBulletList(frameworks, 10));
    lines.push("");
  }

  if (libraries.length) {
    lines.push("**Core Libraries**");
    lines.push(toBulletList(libraries, MAX_LIBRARY_ITEMS));
    lines.push("");
  }

  if (manifests.length) {
    lines.push("**Detected Manifests**");
    lines.push(toBulletList(manifests, 12));
  }

  if (!lines.length) {
    lines.push("- Add core libraries used by this repository.");
  }

  return lines.join("\n");
}

function buildScriptsContent(context = {}) {
  const scripts = Array.isArray(context?.insights?.runtime?.scripts)
    ? context.insights.runtime.scripts
    : [];
  const normalizedScripts = scripts
    .map((entry) => ({
      name: normalizeText(entry?.name),
      command: normalizeText(entry?.command),
    }))
    .filter((entry) => entry.name && entry.command)
    .slice(0, MAX_SCRIPT_ITEMS);

  if (!normalizedScripts.length) {
    return [
      "```bash",
      "# Add your project scripts here",
      "npm run dev",
      "npm run build",
      "npm run start",
      "```",
    ].join("\n");
  }

  const lines = ["```bash"];
  normalizedScripts.forEach((entry) => {
    lines.push(`# ${entry.name}`);
    lines.push(entry.command);
    lines.push("");
  });

  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  lines.push("```");

  return lines.join("\n");
}

function buildInstallationContent(context = {}) {
  const repo = context?.repository || {};
  const owner = normalizeText(repo?.owner || "OWNER");
  const name = normalizeText(repo?.name || "REPO");
  const installCommand = detectInstallCommand(context);

  return [
    "```bash",
    `git clone https://github.com/${owner}/${name}.git`,
    `cd ${name}`,
    installCommand,
    "```",
  ].join("\n");
}

function buildUsageContent(context = {}) {
  const runCommand = detectRunCommand(context);
  const liveUrl = normalizeText(context?.insights?.live_status?.live_url);

  const lines = ["```bash", runCommand, "```"];
  if (liveUrl) {
    lines.push("");
    lines.push(`Live deployment: [${liveUrl}](${liveUrl})`);
  }

  return lines.join("\n");
}

function buildApiReferenceContent(context = {}) {
  const apiPaths = uniqueList(context?.insights?.runtime?.api_paths || [], 14);
  if (!apiPaths.length) {
    return [
      "- If this project exposes APIs, list important routes/endpoints here.",
      "- Include auth requirements, request payloads, and response formats.",
    ].join("\n");
  }

  return [
    "Detected API-related paths:",
    "",
    ...apiPaths.map((path) => `- \`${path}\``),
  ].join("\n");
}

function buildLiveStatusContent(context = {}) {
  const liveStatus = context?.insights?.live_status || {};
  const liveUrl = normalizeText(liveStatus?.live_url);
  const repoUrl = normalizeText(context?.repository?.html_url);
  const docsUrl = normalizeText(liveStatus?.docs_url);
  const health = normalizeText(liveStatus?.status_label || "unknown");

  const lines = [`- Status: **${health || "unknown"}**`];
  if (liveUrl) {
    lines.push(`- Live URL: [${liveUrl}](${liveUrl})`);
  }
  if (repoUrl) {
    lines.push(`- Source: [${repoUrl}](${repoUrl})`);
  }
  if (docsUrl) {
    lines.push(`- Docs: [${docsUrl}](${docsUrl})`);
  }

  return lines.join("\n");
}

function buildRoadmapContent() {
  return [
    "- [ ] Improve developer onboarding and setup automation.",
    "- [ ] Add deeper test coverage for high-impact modules.",
    "- [ ] Expand observability and production diagnostics.",
  ].join("\n");
}

function buildContributingContent() {
  return [
    "1. Fork the repository.",
    "2. Create a feature branch (`feature/your-change`).",
    "3. Commit and push your changes.",
    "4. Open a pull request with clear implementation details.",
  ].join("\n");
}

function buildLicenseContent(context = {}) {
  const license = normalizeText(context?.repository?.license || "");
  if (license) {
    return `This project is distributed under the **${license}** license.`;
  }

  return "Add your project license details here.";
}

function buildDefaultSectionContent(sectionId, context = {}) {
  if (sectionId === "overview") return buildOverviewContent(context);
  if (sectionId === "architecture") return buildArchitectureContent(context);
  if (sectionId === "how_it_works") return buildHowItWorksContent(context);
  if (sectionId === "libraries") return buildLibrariesContent(context);
  if (sectionId === "scripts") return buildScriptsContent(context);
  if (sectionId === "installation") return buildInstallationContent(context);
  if (sectionId === "usage") return buildUsageContent(context);
  if (sectionId === "api_reference") return buildApiReferenceContent(context);
  if (sectionId === "live_status") return buildLiveStatusContent(context);
  if (sectionId === "roadmap") return buildRoadmapContent();
  if (sectionId === "contributing") return buildContributingContent();
  if (sectionId === "license") return buildLicenseContent(context);
  return "";
}

export function createInitialRepoSections(context = {}) {
  return REPO_SECTION_DEFINITIONS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    enabled: Boolean(definition.defaultEnabled),
    content: buildDefaultSectionContent(definition.id, context),
  }));
}

function getStyleById(styleId) {
  const normalized = String(styleId || "").trim().toLowerCase();
  return (
    REPO_MARKDOWN_STYLES.find((entry) => entry.id === normalized) ||
    REPO_MARKDOWN_STYLES[0]
  );
}

function buildRepositoryHeader(repository = {}, style = {}) {
  const name = normalizeText(repository?.name || "Repository");
  const description = normalizeText(repository?.description);
  const owner = normalizeText(repository?.owner);
  const stars = Number(repository?.stargazers_count || 0);
  const forks = Number(repository?.forks_count || 0);
  const license = normalizeText(repository?.license);
  const visibility = normalizeText(repository?.visibility || "public");
  const lines = [`# ${name}`];

  if (description) {
    lines.push("");
    lines.push(description);
  }

  if (style.id !== "minimal") {
    const badges = [
      `![Stars](https://img.shields.io/badge/Stars-${stars}-111111?style=flat-square)`,
      `![Forks](https://img.shields.io/badge/Forks-${forks}-111111?style=flat-square)`,
      `![Visibility](https://img.shields.io/badge/Visibility-${encodeURIComponent(
        visibility
      )}-111111?style=flat-square)`,
    ];

    if (license) {
      badges.push(
        `![License](https://img.shields.io/badge/License-${encodeURIComponent(
          license
        )}-111111?style=flat-square)`
      );
    }

    lines.push("");
    lines.push(badges.join(" "));
  }

  if (owner && repository?.html_url) {
    lines.push("");
    lines.push(`Repository: [${owner}/${name}](${repository.html_url})`);
  }

  return lines.join("\n");
}

function resolveHeadingPrefix(styleId) {
  if (styleId === "minimal") return "###";
  return "##";
}

export function composeRepoMarkdown({
  repository = {},
  sections = [],
  style = "comprehensive",
} = {}) {
  const styleConfig = getStyleById(style);
  const headingPrefix = resolveHeadingPrefix(styleConfig.id);
  const lines = [buildRepositoryHeader(repository, styleConfig)];

  sections
    .filter((section) => section?.enabled)
    .forEach((section) => {
      const title = normalizeText(section?.title);
      const content = normalizeText(section?.content);
      if (!title || !content) return;

      lines.push("");
      lines.push(`${headingPrefix} ${title}`);
      lines.push("");
      lines.push(content);
    });

  return `${lines.join("\n").trim()}\n`;
}

function normalizeAiContentMap(aiContent) {
  if (!aiContent || typeof aiContent !== "object" || Array.isArray(aiContent)) {
    return {};
  }

  const normalized = {};
  Object.entries(aiContent).forEach(([key, value]) => {
    const normalizedKey = String(key || "").trim().toLowerCase();
    const normalizedValue = normalizeText(value);
    if (!normalizedKey || !normalizedValue) return;
    normalized[normalizedKey] = normalizedValue;
  });
  return normalized;
}

export function mergeAiSectionContent(
  sections = [],
  aiContent = {},
  mode = "fill-empty"
) {
  const normalizedMode = String(mode || "fill-empty").trim().toLowerCase();
  const contentMap = normalizeAiContentMap(aiContent);

  if (!Object.keys(contentMap).length) return sections;

  return sections.map((section) => {
    const sectionId = String(section?.id || "").trim().toLowerCase();
    const generated = contentMap[sectionId];
    if (!generated) return section;

    const currentContent = normalizeText(section?.content);
    if (normalizedMode === "fill-empty" && currentContent) {
      return section;
    }

    return {
      ...section,
      content: generated,
    };
  });
}

