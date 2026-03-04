import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import detectAndGroupProjects from "@/app/lib/repo/detectGroupProjects";
import { classifyRepository } from "@/app/lib/security/classifyRepository";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const ID_PATTERN = /^[A-Za-z0-9_.-]+$/;
const MAX_TREE_ITEMS = 12000;
const MAX_MANIFEST_FILES = 14;
const MAX_RELEVANT_FILES = 180;

const MANIFEST_NAMES = new Set([
  "package.json",
  "requirements.txt",
  "pyproject.toml",
  "go.mod",
  "cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "composer.json",
  "gemfile",
]);

const TOP_LEVEL_DIRECTORY_PRIORITY = [
  "src",
  "app",
  "packages",
  "services",
  "api",
  "server",
  "client",
  "lib",
  "cmd",
  "internal",
  "docs",
  "tests",
  "test",
  "scripts",
  "config",
];

const FRAMEWORK_HINTS = [
  { token: "next", label: "Next.js" },
  { token: "react", label: "React" },
  { token: "vite", label: "Vite" },
  { token: "express", label: "Express" },
  { token: "nestjs", label: "NestJS" },
  { token: "fastapi", label: "FastAPI" },
  { token: "django", label: "Django" },
  { token: "flask", label: "Flask" },
  { token: "spring-boot", label: "Spring Boot" },
  { token: "rails", label: "Ruby on Rails" },
  { token: "svelte", label: "Svelte" },
  { token: "vue", label: "Vue" },
  { token: "angular", label: "Angular" },
  { token: "tailwindcss", label: "Tailwind CSS" },
  { token: "typeorm", label: "TypeORM" },
  { token: "prisma", label: "Prisma" },
  { token: "mongoose", label: "Mongoose" },
  { token: "graphql", label: "GraphQL" },
];

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function normalizeId(value) {
  return String(value || "").trim();
}

function normalizeOwner(value) {
  return normalizeId(value).toLowerCase();
}

function normalizePath(value) {
  return String(value || "").replaceAll("\\", "/").trim();
}

function safeText(value) {
  return String(value || "").trim();
}

function toHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

function toRelativePath(pathValue) {
  return String(pathValue || "")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeLicense(license) {
  if (!license || typeof license !== "object") return "";
  if (license.spdx_id && license.spdx_id !== "NOASSERTION") {
    return String(license.spdx_id || "").trim();
  }
  return String(license.name || "").trim();
}

function uniqueList(values = [], max = 40) {
  const out = [];
  const seen = new Set();

  values.forEach((value) => {
    const normalized = safeText(value);
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });

  return out.slice(0, max);
}

function decodeBase64Content(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return Buffer.from(raw, "base64").toString("utf8");
}

function getFileName(path) {
  const normalized = normalizePath(path);
  const parts = normalized.split("/");
  return String(parts[parts.length - 1] || "").trim();
}

function getPathDepth(path) {
  return normalizePath(path)
    .split("/")
    .filter(Boolean).length;
}

function buildTopLevelDirectorySummary(tree = []) {
  const directoryCounts = new Map();
  tree.forEach((entry) => {
    const normalizedPath = normalizePath(entry?.path);
    if (!normalizedPath) return;
    const root = normalizedPath.split("/")[0];
    if (!root) return;
    if (!directoryCounts.has(root)) {
      directoryCounts.set(root, { files: 0, folders: 0 });
    }

    const bucket = directoryCounts.get(root);
    if (entry?.type === "folder") {
      bucket.folders += 1;
    } else {
      bucket.files += 1;
    }
  });

  return [...directoryCounts.entries()]
    .map(([name, metrics]) => ({
      name,
      files: Number(metrics.files || 0),
      folders: Number(metrics.folders || 0),
      score: Number(metrics.files || 0) + Number(metrics.folders || 0) * 2,
    }))
    .sort((a, b) => {
      const priorityA = TOP_LEVEL_DIRECTORY_PRIORITY.indexOf(a.name.toLowerCase());
      const priorityB = TOP_LEVEL_DIRECTORY_PRIORITY.indexOf(b.name.toLowerCase());
      const normalizedPriorityA = priorityA === -1 ? Number.POSITIVE_INFINITY : priorityA;
      const normalizedPriorityB = priorityB === -1 ? Number.POSITIVE_INFINITY : priorityB;
      if (normalizedPriorityA !== normalizedPriorityB) {
        return normalizedPriorityA - normalizedPriorityB;
      }
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
}

function buildStructurePreview({ repositoryName = "", tree = [] }) {
  const topLevelFolders = tree
    .filter((entry) => entry?.type === "folder" && getPathDepth(entry.path) === 1)
    .map((entry) => normalizePath(entry.path));
  const topLevelFiles = tree
    .filter((entry) => entry?.type === "file" && getPathDepth(entry.path) === 1)
    .map((entry) => normalizePath(entry.path))
    .sort((a, b) => a.localeCompare(b));

  const sortedFolders = buildTopLevelDirectorySummary(tree)
    .map((entry) => entry.name)
    .filter((name) => topLevelFolders.includes(name))
    .slice(0, 10);

  const lines = [`${repositoryName || "repository"}/`];

  sortedFolders.forEach((folder) => {
    lines.push(`- ${folder}/`);

    const nested = new Set();
    tree.forEach((entry) => {
      const path = normalizePath(entry?.path);
      if (!path.startsWith(`${folder}/`)) return;
      const relative = path.slice(folder.length + 1);
      const child = relative.split("/")[0];
      if (!child) return;
      nested.add(child);
    });

    [...nested]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 6)
      .forEach((child) => {
        const childPrefix = `${folder}/${child}`;
        const childIsFolder =
          tree.some(
            (entry) =>
              entry?.type === "folder" && normalizePath(entry?.path) === childPrefix
          ) ||
          tree.some((entry) => normalizePath(entry?.path).startsWith(`${childPrefix}/`));

        lines.push(`  - ${child}${childIsFolder ? "/" : ""}`);
      });
  });

  topLevelFiles.slice(0, 8).forEach((file) => {
    lines.push(`- ${file}`);
  });

  return lines.slice(0, 120);
}

function detectFrameworksFromLibraries(libraries = []) {
  const normalizedLibraries = libraries.map((entry) =>
    String(entry || "").trim().toLowerCase()
  );
  const frameworks = [];

  FRAMEWORK_HINTS.forEach((hint) => {
    const found = normalizedLibraries.some((entry) => entry.includes(hint.token));
    if (!found) return;
    frameworks.push(hint.label);
  });

  return uniqueList(frameworks, 20);
}

function parsePackageJson(content = "") {
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      libraries: [],
      scripts: [],
      frameworks: [],
    };
  }

  const dependencyGroups = [
    parsed.dependencies || {},
    parsed.devDependencies || {},
    parsed.peerDependencies || {},
    parsed.optionalDependencies || {},
  ];
  const libraries = uniqueList(
    dependencyGroups.flatMap((group) => Object.keys(group || {})),
    220
  );
  const scripts = Object.entries(parsed.scripts || {})
    .map(([name, command]) => ({
      name: safeText(name),
      command: safeText(command),
    }))
    .filter((entry) => entry.name && entry.command)
    .slice(0, 50);

  return {
    libraries,
    scripts,
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseRequirements(content = "") {
  const libraries = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.replace(/\s*#.*$/, ""))
    .map((line) => line.split(/[<>=!~]/)[0].trim())
    .filter(Boolean);

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parsePyProject(content = "") {
  const libraries = [];
  let inPoetryDependencies = false;
  let inProjectDependencies = false;

  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    if (line.startsWith("[") && line.endsWith("]")) {
      inPoetryDependencies = line === "[tool.poetry.dependencies]";
      inProjectDependencies = line === "[project]";
      return;
    }

    if (inPoetryDependencies && line.includes("=")) {
      const key = line.split("=")[0]?.trim();
      if (key && key.toLowerCase() !== "python") {
        libraries.push(key);
      }
      return;
    }

    if (inProjectDependencies && line.startsWith("dependencies")) {
      const inlineMatches = [...line.matchAll(/"([^"]+)"/g)].map((match) =>
        String(match?.[1] || "").split(/[<>=!~]/)[0].trim()
      );
      libraries.push(...inlineMatches.filter(Boolean));
    }
  });

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseGoMod(content = "") {
  const libraries = [];
  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) return;
    if (line.startsWith("require ")) {
      const parts = line.replace("require ", "").split(/\s+/);
      if (parts[0]) libraries.push(parts[0]);
      return;
    }
    if (line.startsWith("replace ")) {
      const parts = line.replace("replace ", "").split(/\s+/);
      if (parts[0]) libraries.push(parts[0]);
    }
  });

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseCargoToml(content = "") {
  const libraries = [];
  let inDependencies = false;

  content.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) return;

    if (line.startsWith("[") && line.endsWith("]")) {
      inDependencies = line === "[dependencies]";
      return;
    }

    if (!inDependencies) return;
    if (!line.includes("=")) return;
    const key = line.split("=")[0]?.trim();
    if (key) libraries.push(key);
  });

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parsePomXml(content = "") {
  const libraries = [...content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map(
    (match) => String(match?.[1] || "").trim()
  );

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseGradle(content = "") {
  const libraries = [];
  [...content.matchAll(/["']([^"']+:[^"']+:[^"']+)["']/g)].forEach((match) => {
    const value = String(match?.[1] || "").trim();
    if (!value) return;
    libraries.push(value.split(":")[1] || value);
  });

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseComposer(content = "") {
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== "object") {
    return { libraries: [], scripts: [], frameworks: [] };
  }

  const libraries = uniqueList(
    [...Object.keys(parsed.require || {}), ...Object.keys(parsed["require-dev"] || {})],
    220
  );

  return {
    libraries,
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseGemfile(content = "") {
  const libraries = [...content.matchAll(/gem\s+["']([^"']+)["']/g)].map((match) =>
    String(match?.[1] || "").trim()
  );

  return {
    libraries: uniqueList(libraries, 220),
    scripts: [],
    frameworks: detectFrameworksFromLibraries(libraries),
  };
}

function parseManifestByName(fileName, content) {
  const normalizedName = String(fileName || "").trim().toLowerCase();
  if (normalizedName === "package.json") return parsePackageJson(content);
  if (normalizedName === "requirements.txt") return parseRequirements(content);
  if (normalizedName === "pyproject.toml") return parsePyProject(content);
  if (normalizedName === "go.mod") return parseGoMod(content);
  if (normalizedName === "cargo.toml") return parseCargoToml(content);
  if (normalizedName === "pom.xml") return parsePomXml(content);
  if (normalizedName === "build.gradle" || normalizedName === "build.gradle.kts") {
    return parseGradle(content);
  }
  if (normalizedName === "composer.json") return parseComposer(content);
  if (normalizedName === "gemfile") return parseGemfile(content);

  return {
    libraries: [],
    scripts: [],
    frameworks: [],
  };
}

function inferHowItWorksHints({
  frameworks = [],
  scripts = [],
  apiPaths = [],
  tree = [],
  classification = {},
}) {
  const hints = [];
  const topDirectories = new Set(
    tree
      .map((entry) => normalizePath(entry?.path).split("/")[0])
      .filter(Boolean)
  );
  const normalizedFrameworks = frameworks.map((entry) => entry.toLowerCase());
  const scriptNames = new Set(scripts.map((entry) => String(entry?.name || "").toLowerCase()));
  const packageManagers = Array.isArray(classification?.package_managers)
    ? classification.package_managers
    : [];

  if (normalizedFrameworks.includes("next.js")) {
    hints.push(
      "Next.js is used as the main runtime layer. UI routes and server handlers are likely organized under `app/` or `src/app/`."
    );
  }

  if (normalizedFrameworks.includes("react") && !normalizedFrameworks.includes("next.js")) {
    hints.push(
      "React powers the front-end layer. Build and development workflows are orchestrated through project scripts."
    );
  }

  if (normalizedFrameworks.includes("fastapi") || normalizedFrameworks.includes("flask")) {
    hints.push(
      "Python web services handle request processing and response serialization through framework-defined route handlers."
    );
  }

  if (apiPaths.length) {
    hints.push(
      "API-oriented paths indicate a service layer where request handlers, controllers, or route modules drive business logic."
    );
  }

  if (topDirectories.has("packages") || topDirectories.has("apps")) {
    hints.push(
      "Repository layout suggests a multi-project workspace. Shared logic and app-specific code are split across top-level modules."
    );
  }

  if (topDirectories.has("docs")) {
    hints.push(
      "Documentation assets are versioned with source code, which helps keep implementation and usage guidance aligned."
    );
  }

  if (topDirectories.has(".github")) {
    hints.push(
      "Automation under `.github/` indicates CI/CD and quality checks are integrated into the development workflow."
    );
  }

  if (scriptNames.has("test") || scriptNames.has("lint")) {
    hints.push(
      "Quality gates are script-driven (`test`/`lint`), enabling repeatable validation before releases."
    );
  }

  if (packageManagers.length) {
    hints.push(
      `Dependency and build orchestration primarily use: ${uniqueList(packageManagers, 4).join(", ")}.`
    );
  }

  if (!hints.length) {
    hints.push(
      "Core flow can be summarized by mapping entry points, service modules, and output boundaries for maintainers."
    );
  }

  return uniqueList(hints, 10);
}

function mapRepository(repo = {}) {
  return {
    id: Number(repo?.id || 0),
    owner: safeText(repo?.owner?.login),
    name: safeText(repo?.name),
    full_name: safeText(repo?.full_name),
    description: safeText(repo?.description),
    html_url: safeText(repo?.html_url),
    homepage: safeText(repo?.homepage),
    language: safeText(repo?.language),
    topics: Array.isArray(repo?.topics) ? uniqueList(repo.topics, 24) : [],
    private: Boolean(repo?.private),
    visibility: safeText(repo?.visibility || (repo?.private ? "private" : "public")),
    default_branch: safeText(repo?.default_branch),
    created_at: safeText(repo?.created_at),
    updated_at: safeText(repo?.updated_at),
    pushed_at: safeText(repo?.pushed_at),
    stargazers_count: Number(repo?.stargazers_count || 0),
    forks_count: Number(repo?.forks_count || 0),
    watchers_count: Number(repo?.watchers_count || 0),
    open_issues_count: Number(repo?.open_issues_count || 0),
    archived: Boolean(repo?.archived),
    disabled: Boolean(repo?.disabled),
    has_pages: Boolean(repo?.has_pages),
    has_wiki: Boolean(repo?.has_wiki),
    license: normalizeLicense(repo?.license),
  };
}

async function fetchGithubJson(url, token) {
  const response = await fetch(url, {
    headers: toHeaders(token),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error: payload?.message || "GitHub request failed",
      payload,
    };
  }

  return {
    ok: true,
    status: response.status,
    data: payload,
  };
}

async function fetchRepoTree({ owner, repo, branch, token }) {
  const treeResponse = await fetchGithubJson(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
    token
  );

  if (!treeResponse.ok) {
    return treeResponse;
  }

  const rawTree = Array.isArray(treeResponse?.data?.tree) ? treeResponse.data.tree : [];
  const normalizedTree = rawTree
    .map((entry) => ({
      path: normalizePath(entry?.path),
      type: entry?.type === "tree" ? "folder" : "file",
      size: Number(entry?.size || 0),
    }))
    .filter((entry) => entry.path);

  return {
    ok: true,
    status: 200,
    data: {
      tree: normalizedTree.slice(0, MAX_TREE_ITEMS),
      truncated: normalizedTree.length > MAX_TREE_ITEMS,
      total: normalizedTree.length,
    },
  };
}

async function fetchRepositoryFile({ owner, repo, path, token, ref }) {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return null;

  const response = await fetchGithubJson(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${toRelativePath(normalizedPath)}?ref=${encodeURIComponent(
      ref
    )}`,
    token
  );

  if (!response.ok) {
    return null;
  }

  const body = response.data;
  if (!body || Array.isArray(body) || body.type !== "file") return null;
  if (body.encoding !== "base64" || typeof body.content !== "string") return null;

  return {
    path: normalizedPath,
    content: decodeBase64Content(body.content),
    size: Number(body.size || 0),
  };
}

async function fetchReadme({ owner, repo, token, ref }) {
  const response = await fetchGithubJson(
    `${GITHUB_API}/repos/${owner}/${repo}/readme?ref=${encodeURIComponent(ref)}`,
    token
  );

  if (!response.ok) {
    return {
      exists: false,
      path: "",
      content: "",
    };
  }

  const data = response.data;
  if (!data || data.type !== "file" || data.encoding !== "base64") {
    return {
      exists: false,
      path: "",
      content: "",
    };
  }

  return {
    exists: true,
    path: safeText(data.path || "README.md"),
    content: decodeBase64Content(data.content),
  };
}

function buildLiveStatus({ owner, repo, repository = {}, tree = [] }) {
  const homepage = safeText(repository?.homepage);
  const hasPages = Boolean(repository?.has_pages);
  const hasWiki = Boolean(repository?.has_wiki);
  const docsFolderExists = tree.some((entry) => normalizePath(entry?.path).startsWith("docs/"));
  const inferredPagesUrl = hasPages ? `https://${owner}.github.io/${repo}` : "";
  const liveUrl = homepage || inferredPagesUrl;

  return {
    status_label: liveUrl ? "live" : "not_configured",
    live_url: liveUrl,
    docs_url: hasWiki
      ? `${safeText(repository?.html_url)}/wiki`
      : docsFolderExists
        ? `${safeText(repository?.html_url)}/tree/${safeText(repository?.default_branch) || "main"}/docs`
        : "",
    has_pages: hasPages,
    has_wiki: hasWiki,
  };
}

function collectManifestPaths(tree = []) {
  return tree
    .filter((entry) => entry?.type === "file")
    .map((entry) => normalizePath(entry.path))
    .filter((path) => MANIFEST_NAMES.has(getFileName(path).toLowerCase()))
    .sort((a, b) => {
      const depthA = getPathDepth(a);
      const depthB = getPathDepth(b);
      if (depthA !== depthB) return depthA - depthB;
      return a.localeCompare(b);
    })
    .slice(0, MAX_MANIFEST_FILES);
}

function collectApiPaths(relevantFiles = []) {
  return uniqueList(
    relevantFiles
      .map((entry) => normalizePath(entry?.path))
      .filter(Boolean)
      .filter(
        (path) =>
          path.startsWith("api/") ||
          path.includes("/api/") ||
          path.endsWith("/route.js") ||
          path.endsWith("/route.ts")
      ),
    24
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const accessToken = safeText(session?.accessToken);
    if (!accessToken) {
      return jsonError(401, "Missing GitHub access token. Please sign in again.");
    }

    const body = await req.json().catch(() => ({}));
    const owner = normalizeId(body?.owner);
    const repo = normalizeId(body?.repo);

    if (!owner || !repo) {
      return jsonError(400, "Both owner and repo are required");
    }

    if (!ID_PATTERN.test(owner) || !ID_PATTERN.test(repo)) {
      return jsonError(400, "Invalid owner or repo format");
    }

    const sessionOwnerCandidates = [
      normalizeOwner(session?.username),
      normalizeOwner(session?.user?.name),
    ].filter(Boolean);

    if (!sessionOwnerCandidates.includes(normalizeOwner(owner))) {
      return jsonError(403, "Owner must match the authenticated GitHub user");
    }

    const repoInfoResponse = await fetchGithubJson(
      `${GITHUB_API}/repos/${owner}/${repo}`,
      accessToken
    );
    if (!repoInfoResponse.ok) {
      return jsonError(
        repoInfoResponse.status || 404,
        repoInfoResponse.error || "Repository not found"
      );
    }

    const repoInfo = mapRepository(repoInfoResponse.data);
    const branch = repoInfo.default_branch || "main";

    const [treeResponse, readmeResponse] = await Promise.all([
      fetchRepoTree({
        owner,
        repo,
        branch,
        token: accessToken,
      }),
      fetchReadme({
        owner,
        repo,
        token: accessToken,
        ref: branch,
      }),
    ]);

    if (!treeResponse.ok) {
      return jsonError(treeResponse.status || 502, treeResponse.error || "Failed to fetch tree");
    }

    const normalizedTree = treeResponse.data.tree;
    const totalFiles = normalizedTree.filter((entry) => entry.type === "file").length;
    const totalFolders = normalizedTree.filter((entry) => entry.type === "folder").length;

    const relevantFiles = getRelevantFiles(normalizedTree, { maxFiles: MAX_RELEVANT_FILES }).map(
      (entry) => ({
        path: normalizePath(entry?.path),
        type: entry?.type === "tree" ? "folder" : "file",
      })
    );
    const classification = classifyRepository(normalizedTree);
    const groupedProjects = detectAndGroupProjects(normalizedTree);
    const projectGroups = uniqueList(Object.keys(groupedProjects || {}), 20);
    const manifestPaths = collectManifestPaths(normalizedTree);

    const manifestFiles = (
      await Promise.all(
        manifestPaths.map((path) =>
          fetchRepositoryFile({
            owner,
            repo,
            path,
            token: accessToken,
            ref: branch,
          })
        )
      )
    ).filter(Boolean);

    const libraries = new Set();
    const frameworks = new Set();
    const scriptsByName = new Map();

    manifestFiles.forEach((manifest) => {
      const parsed = parseManifestByName(getFileName(manifest.path), manifest.content);
      parsed.libraries.forEach((library) => libraries.add(String(library || "").trim()));
      parsed.frameworks.forEach((framework) => frameworks.add(String(framework || "").trim()));
      parsed.scripts.forEach((script) => {
        const name = safeText(script?.name).toLowerCase();
        const command = safeText(script?.command);
        if (!name || !command || scriptsByName.has(name)) return;
        scriptsByName.set(name, {
          name,
          command,
        });
      });
    });

    const detectedByFileName = normalizedTree.map((entry) => getFileName(entry.path).toLowerCase());
    if (detectedByFileName.some((name) => name.startsWith("next.config"))) {
      frameworks.add("Next.js");
    }
    if (detectedByFileName.includes("dockerfile")) {
      frameworks.add("Docker");
    }

    const scripts = [...scriptsByName.values()].slice(0, 40);
    const apiPaths = collectApiPaths(relevantFiles);
    const structurePreview = buildStructurePreview({
      repositoryName: repoInfo.name || repo,
      tree: normalizedTree,
    });
    const topLevelDirectorySummary = buildTopLevelDirectorySummary(normalizedTree);

    const howItWorksHints = inferHowItWorksHints({
      frameworks: [...frameworks],
      scripts,
      apiPaths,
      tree: normalizedTree,
      classification,
    });

    const liveStatus = buildLiveStatus({
      owner,
      repo,
      repository: repoInfo,
      tree: normalizedTree,
    });

    return NextResponse.json(
      {
        ok: true,
        generatedAt: new Date().toISOString(),
        repository: repoInfo,
        readme: readmeResponse,
        insights: {
          classification,
          architecture: {
            total_files: totalFiles,
            total_folders: totalFolders,
            tree_total_items: Number(treeResponse.data.total || normalizedTree.length),
            tree_truncated: Boolean(treeResponse.data.truncated),
            top_level_directories: topLevelDirectorySummary.map((entry) => entry.name),
            top_level_summary: topLevelDirectorySummary.slice(0, 24),
            structure_preview: structurePreview,
            project_groups: projectGroups,
            relevant_files: relevantFiles.slice(0, 220),
          },
          libraries: {
            manifests: manifestPaths,
            detected: uniqueList([...libraries], 240),
            frameworks: uniqueList([...frameworks], 40),
          },
          runtime: {
            scripts,
            api_paths: apiPaths,
          },
          how_it_works: {
            hints: howItWorksHints,
          },
          live_status: liveStatus,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(500, error?.message || "Failed to build repository context");
  }
}

