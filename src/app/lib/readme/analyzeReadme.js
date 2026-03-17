const SECTION_DEFINITIONS = [
  {
    key: "overview",
    label: "Overview",
    required: true,
    patterns: [/^(overview|about|introduction|summary|what is)/i],
  },
  {
    key: "features",
    label: "Features",
    required: true,
    patterns: [/^(features|highlights|capabilities|key features)/i],
  },
  {
    key: "techStack",
    label: "Tech Stack",
    required: false,
    patterns: [/^(tech stack|stack|built with|architecture|technologies)/i],
  },
  {
    key: "installation",
    label: "Installation",
    required: true,
    patterns: [/^(installation|setup|get(?:ting)? started|quick start)/i],
  },
  {
    key: "usage",
    label: "Usage",
    required: true,
    patterns: [/^(usage|how to use|examples|run locally|running locally)/i],
  },
  {
    key: "configuration",
    label: "Configuration",
    required: false,
    patterns: [/^(configuration|config|environment|env|settings)/i],
  },
  {
    key: "projectStructure",
    label: "Project Structure",
    required: false,
    patterns: [/^(project structure|folder structure|directory structure|structure)/i],
  },
  {
    key: "roadmap",
    label: "Roadmap",
    required: false,
    patterns: [/^(roadmap|future work|next steps|planned)/i],
  },
  {
    key: "contributing",
    label: "Contributing",
    required: false,
    patterns: [/^(contributing|development|developer guide)/i],
  },
  {
    key: "license",
    label: "License",
    required: false,
    patterns: [/^(license|licence)/i],
  },
];

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function safeTrim(value) {
  return String(value || "").trim();
}

function countMatches(text, pattern) {
  const matches = safeTrim(text).match(pattern);
  return Array.isArray(matches) ? matches.length : 0;
}

function extractHeadings(markdown) {
  return safeTrim(markdown)
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{1,6})\s+(.+?)\s*$/))
    .filter(Boolean)
    .map((match) => ({
      level: match[1].length,
      text: safeTrim(match[2]),
    }));
}

function detectSectionCoverage(headings, markdown) {
  const safeHeadings = Array.isArray(headings) ? headings : [];
  const hasTopMatter = safeTrim(markdown).length > 60 && safeHeadings.length > 0;

  return SECTION_DEFINITIONS.map((section) => {
    const foundByHeading = safeHeadings.some((heading) =>
      section.patterns.some((pattern) => pattern.test(heading.text))
    );

    const found = section.key === "overview" ? foundByHeading || hasTopMatter : foundByHeading;

    return {
      ...section,
      found,
    };
  });
}

function buildStrengths({ score, sectionCoverage, stats, hasTitle }) {
  const strengths = [];

  if (hasTitle) strengths.push("Starts with a recognizable project title.");
  if (sectionCoverage.filter((section) => section.found).length >= 5) {
    strengths.push("Covers the major README sections expected by contributors.");
  }
  if (stats.codeBlocks > 0) {
    strengths.push("Includes runnable examples or command snippets.");
  }
  if (stats.badges > 0) {
    strengths.push("Uses badges to communicate status or ecosystem context quickly.");
  }
  if (score >= 75) {
    strengths.push("Feels production-ready and well structured for open-source readers.");
  }

  return strengths.slice(0, 4);
}

function buildGaps({ sectionCoverage, stats, hasTitle }) {
  const gaps = [];

  if (!hasTitle) {
    gaps.push("Missing a clear H1 title at the top.");
  }

  sectionCoverage
    .filter((section) => section.required && !section.found)
    .forEach((section) => {
      gaps.push(`Missing a dedicated ${section.label} section.`);
    });

  if (stats.words > 0 && stats.words < 80) {
    gaps.push("README is very short and may not explain the project well enough.");
  }

  if (stats.codeBlocks === 0) {
    gaps.push("No code block or command example is present.");
  }

  return gaps.slice(0, 5);
}

function buildRecommendations({ sectionCoverage, stats, repoName }) {
  const recommendations = [];
  const missing = sectionCoverage.filter((section) => !section.found);

  if (missing.some((section) => section.key === "overview")) {
    recommendations.push(
      `Open with a short explanation of what ${repoName || "this project"} does and who it is for.`
    );
  }

  if (missing.some((section) => section.key === "features")) {
    recommendations.push("Add a concise feature list so readers can scan the value quickly.");
  }

  if (missing.some((section) => section.key === "installation")) {
    recommendations.push("Document installation and setup commands step by step.");
  }

  if (missing.some((section) => section.key === "usage")) {
    recommendations.push("Show a minimal usage example or local run workflow.");
  }

  if (stats.codeBlocks === 0) {
    recommendations.push("Include at least one fenced code block for commands or example usage.");
  }

  if (stats.images === 0 && stats.words > 180) {
    recommendations.push("Consider adding one visual, architecture diagram, or terminal screenshot.");
  }

  return recommendations.slice(0, 5);
}

export function analyzeReadme(markdown, context = {}) {
  const content = safeTrim(markdown);
  const headings = extractHeadings(content);
  const lines = content ? content.split(/\r?\n/) : [];
  const title = headings.find((heading) => heading.level === 1)?.text || "";
  const words = content ? content.split(/\s+/).filter(Boolean).length : 0;
  const badges = countMatches(content, /(img\.shields\.io|badge\/|badge=)/gi);
  const images = countMatches(content, /!\[[^\]]*\]\([^)]+\)/g);
  const links = countMatches(content, /\[[^\]]+\]\((https?:\/\/|\.\/|\/)/g);
  const codeFenceMarkers = countMatches(content, /```/g);
  const codeBlocks = Math.floor(codeFenceMarkers / 2);
  const sectionCoverage = detectSectionCoverage(headings, content);
  const foundSections = sectionCoverage.filter((section) => section.found).length;

  const sectionScore = (foundSections / SECTION_DEFINITIONS.length) * 70;
  const structureScore = Math.min(10, headings.length * 2);
  const depthScore =
    words >= 250 ? 10 : words >= 150 ? 8 : words >= 80 ? 5 : words > 0 ? 2 : 0;
  const codeScore = Math.min(6, codeBlocks * 2);
  const polishScore = Math.min(4, badges > 0 ? 2 : 0) + Math.min(4, images > 0 ? 2 : 0);
  const score = content
    ? Math.round(clamp(sectionScore + structureScore + depthScore + codeScore + polishScore))
    : 0;

  const qualityLabel =
    score >= 85
      ? "Excellent"
      : score >= 70
        ? "Strong"
        : score >= 50
          ? "Growing"
          : score > 0
            ? "Needs Work"
            : "Missing";

  const stats = {
    words,
    headings: headings.length,
    badges,
    images,
    links,
    codeBlocks,
    lines: lines.length,
  };

  return {
    title,
    score,
    qualityLabel,
    headings,
    stats,
    sectionCoverage,
    missingSections: sectionCoverage
      .filter((section) => !section.found)
      .map((section) => section.label),
    strengths: buildStrengths({
      score,
      sectionCoverage,
      stats,
      hasTitle: Boolean(title),
    }),
    gaps: buildGaps({
      sectionCoverage,
      stats,
      hasTitle: Boolean(title),
    }),
    recommendations: buildRecommendations({
      sectionCoverage,
      stats,
      repoName: context?.repoName || context?.repoDescription || "this project",
    }),
  };
}

export const README_SECTION_DEFINITIONS = SECTION_DEFINITIONS;
