const DEFAULT_MAX_FILES = 120;

const IGNORED_FOLDERS = new Set([
  ".git",
  ".github",
  ".idea",
  ".vscode",
  ".next",
  ".nuxt",
  ".svelte-kit",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "out",
  "target",
  "vendor",
  "Pods",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".venv",
  "venv",
  "bin",
  "obj",
]);

const SOURCE_FOLDERS = new Set([
  "src",
  "app",
  "pages",
  "lib",
  "cmd",
  "pkg",
  "internal",
  "server",
  "client",
  "api",
  "services",
  "modules",
  "crates",
  "include",
]);

const MANIFEST_FILES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lockb",
  "deno.json",
  "deno.jsonc",
  "tsconfig.json",
  "pyproject.toml",
  "requirements.txt",
  "requirements-dev.txt",
  "pipfile",
  "pipfile.lock",
  "poetry.lock",
  "setup.py",
  "setup.cfg",
  "go.mod",
  "go.sum",
  "cargo.toml",
  "cargo.lock",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "settings.gradle",
  "settings.gradle.kts",
  "composer.json",
  "composer.lock",
  "gemfile",
  "gemfile.lock",
  "mix.exs",
  "mix.lock",
  "pubspec.yaml",
  "pubspec.lock",
  "project.clj",
  "deps.edn",
  "makefile",
  "cmakelists.txt",
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
]);

const IMPORTANT_DOCS = new Set([
  "contributing.md",
  "changelog.md",
  "license",
  "license.md",
  "licence",
  "licence.md",
  "security.md",
  "code_of_conduct.md",
]);

const IMPORTANT_CONFIGS = new Set([
  ".env.example",
  ".editorconfig",
  ".gitignore",
  ".gitattributes",
  ".nvmrc",
  ".tool-versions",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  ".eslintrc",
  ".eslintrc.js",
  ".eslintrc.cjs",
  ".eslintrc.json",
  ".prettierrc",
  ".prettierrc.js",
  ".prettierrc.cjs",
  ".prettierrc.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
  "webpack.config.ts",
  "rollup.config.js",
  "rollup.config.ts",
  "tailwind.config.js",
  "tailwind.config.ts",
]);

const CODE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "go",
  "rs",
  "java",
  "kt",
  "kts",
  "cs",
  "fs",
  "fsx",
  "cpp",
  "cxx",
  "cc",
  "c",
  "h",
  "hpp",
  "hh",
  "m",
  "mm",
  "php",
  "rb",
  "swift",
  "scala",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "lua",
  "dart",
  "ex",
  "exs",
  "erl",
  "clj",
  "cljs",
  "sql",
  "r",
  "vue",
  "svelte",
]);

const IGNORED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "ico",
  "pdf",
  "zip",
  "gz",
  "tar",
  "tgz",
  "7z",
  "rar",
  "mp3",
  "wav",
  "mp4",
  "mov",
  "avi",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "exe",
  "dll",
  "bin",
  "class",
  "jar",
  "so",
  "dylib",
]);

const README_PATTERN = /^readme(\..+)?$/i;
const TEST_PATH_PATTERN = /(^|\/)(__tests__|tests?|spec)(\/|$)/i;

function getFileName(path) {
  const segments = path.split("/");
  return segments[segments.length - 1] || "";
}

function getExtension(fileName) {
  const index = fileName.lastIndexOf(".");
  if (index === -1) return "";
  return fileName.slice(index + 1).toLowerCase();
}

function isFileNode(item) {
  return item?.type === "file" || item?.type === "blob";
}

function shouldIgnorePath(path) {
  const lowerPath = path.toLowerCase();
  const parts = lowerPath.split("/");
  const fileName = parts[parts.length - 1] || "";
  const ext = getExtension(fileName);

  if (lowerPath.startsWith(".github/workflows/")) {
    return false;
  }

  if (parts.some((part) => IGNORED_FOLDERS.has(part))) {
    return true;
  }

  if (fileName.endsWith(".min.js") || fileName.endsWith(".min.css")) {
    return true;
  }

  return IGNORED_EXTENSIONS.has(ext);
}

function isManifest(fileName) {
  if (MANIFEST_FILES.has(fileName)) return true;
  return (
    fileName.endsWith(".csproj") ||
    fileName.endsWith(".fsproj") ||
    fileName.endsWith(".vcxproj") ||
    fileName.endsWith(".sln")
  );
}

function scorePath(path) {
  const lowerPath = path.toLowerCase();
  const segments = lowerPath.split("/");
  const fileName = segments[segments.length - 1] || "";
  const ext = getExtension(fileName);
  const depth = Math.max(segments.length - 1, 0);
  const topFolder = segments[0] || "";
  const inSourceFolder = segments.some((segment) => SOURCE_FOLDERS.has(segment));
  const isDocPath = lowerPath.startsWith("docs/") || lowerPath.includes("/docs/");
  const isTestFile =
    TEST_PATH_PATTERN.test(lowerPath) ||
    fileName.includes(".test.") ||
    fileName.includes(".spec.");

  let score = 0;

  if (README_PATTERN.test(fileName)) score += 1200;
  if (isManifest(fileName)) score += 1000;
  if (IMPORTANT_DOCS.has(fileName)) score += 850;
  if (IMPORTANT_CONFIGS.has(fileName)) score += 700;
  if (lowerPath.startsWith(".github/workflows/")) score += 600;

  if (CODE_EXTENSIONS.has(ext)) score += 400;
  if (inSourceFolder) score += 300;
  if (SOURCE_FOLDERS.has(topFolder)) score += 150;

  if (isDocPath && (ext === "md" || ext === "mdx" || ext === "rst" || ext === "txt")) {
    score += 260;
  }

  if (depth <= 1) score += 140;
  else if (depth <= 3) score += 80;

  if (isTestFile) score -= 240;
  if (lowerPath.includes("/examples/") || lowerPath.includes("/samples/")) score -= 60;

  return score;
}

function uniqueByPath(items) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    if (!seen.has(item.path)) {
      seen.add(item.path);
      result.push(item);
    }
  }

  return result;
}

export default function getRelevantFiles(repoTree, options = {}) {
  if (!Array.isArray(repoTree)) return [];

  const maxFiles = Number.isFinite(options.maxFiles)
    ? Math.max(1, Math.floor(options.maxFiles))
    : DEFAULT_MAX_FILES;

  const candidateFiles = repoTree.filter((item) => {
    if (!item || typeof item.path !== "string") return false;
    if (!isFileNode(item)) return false;
    return !shouldIgnorePath(item.path);
  });

  if (candidateFiles.length === 0) return [];

  const scored = candidateFiles
    .map((item) => ({
      item,
      score: scorePath(item.path),
      depth: item.path.split("/").length,
    }))
    .filter((entry) => entry.score > 0);

  if (scored.length === 0) {
    return candidateFiles.slice(0, maxFiles);
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.depth !== b.depth) return a.depth - b.depth;
    return a.item.path.localeCompare(b.item.path);
  });

  const selected = scored.slice(0, maxFiles).map((entry) => entry.item);

  const readme = candidateFiles.find((item) =>
    README_PATTERN.test(getFileName(item.path))
  );

  if (readme && !selected.some((item) => item.path === readme.path)) {
    if (selected.length >= maxFiles) {
      selected[selected.length - 1] = readme;
    } else {
      selected.push(readme);
    }
  }

  return uniqueByPath(selected);
}
