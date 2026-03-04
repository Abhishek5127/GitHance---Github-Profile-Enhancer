export const DEFAULT_MAX_REPO_TREE_ITEMS = 12000;
export const DEFAULT_MAX_ANALYZED_FILES = 450;
export const DEFAULT_MAX_FILE_SIZE_BYTES = 350_000;
export const DEFAULT_FETCH_CONCURRENCY = 10;
export const DEFAULT_MAX_FINDINGS_RETURNED = 240;

export const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "vendor",
  "dist",
  "build",
  "out",
  "target",
  "bin",
  "obj",
  "coverage",
  "generated",
  "third_party",
  "external",
  "deps",
  "env",
  "venv",
  ".venv",
  "site-packages",
  "__pycache__",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".idea",
  ".vscode",
  ".mvn",
  ".gradle",
  ".mypy_cache",
  ".pytest_cache",
  ".tox",
  ".cache",
]);

export const LOCK_FILE_NAMES = new Set([
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "cargo.lock",
  "go.sum",
  "poetry.lock",
  "pipfile.lock",
  "composer.lock",
  "gemfile.lock",
  "mix.lock",
  "podfile.lock",
  "packages.lock.json",
  "paket.lock",
  "deps.edn",
  "flake.lock",
]);

export const COMPILED_EXTENSIONS = new Set([
  "class",
  "exe",
  "dll",
  "so",
  "dylib",
  "a",
  "o",
  "obj",
  "pyc",
  "pyo",
  "whl",
  "jar",
  "war",
  "ear",
  "apk",
  "ipa",
  "min.js.map",
  "min.css.map",
]);

export const BINARY_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "ico",
  "svg",
  "pdf",
  "zip",
  "gz",
  "tar",
  "tgz",
  "7z",
  "rar",
  "woff",
  "woff2",
  "ttf",
  "otf",
  "eot",
  "mp3",
  "wav",
  "mp4",
  "mov",
  "avi",
  "mkv",
  "bin",
  "dat",
]);

export const DEVELOPER_SOURCE_EXTENSIONS = new Set([
  "js",
  "jsx",
  "ts",
  "tsx",
  "mjs",
  "cjs",
  "py",
  "java",
  "kt",
  "kts",
  "go",
  "rs",
  "c",
  "h",
  "hpp",
  "hh",
  "cpp",
  "cxx",
  "cc",
  "cs",
  "php",
  "rb",
  "swift",
  "scala",
  "lua",
  "dart",
  "r",
  "sql",
  "sh",
  "bash",
  "zsh",
  "ps1",
  "psm1",
  "psd1",
  "tf",
  "hcl",
  "tfvars",
  "yaml",
  "yml",
  "toml",
  "ini",
  "cfg",
  "conf",
  "properties",
  "xml",
  "json",
  "md",
  "adoc",
  "rst",
  "env",
  "dockerfile",
]);

export const DEVELOPER_SOURCE_FILE_NAMES = new Set([
  "dockerfile",
  "docker-compose.yml",
  "docker-compose.yaml",
  "makefile",
  "cmakelists.txt",
  "jenkinsfile",
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".gitlab-ci.yml",
  ".github/workflows",
  "terraform.tfvars",
]);

export const LANGUAGE_BY_EXTENSION = {
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  ts: "TypeScript",
  tsx: "TypeScript",
  py: "Python",
  java: "Java",
  kt: "Kotlin",
  kts: "Kotlin",
  go: "Go",
  rs: "Rust",
  c: "C",
  h: "C/C++",
  hpp: "C++",
  hh: "C++",
  cpp: "C++",
  cxx: "C++",
  cc: "C++",
  cs: "C#",
  php: "PHP",
  rb: "Ruby",
  swift: "Swift",
  scala: "Scala",
  lua: "Lua",
  dart: "Dart",
  r: "R",
  sql: "SQL",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  ps1: "PowerShell",
  psm1: "PowerShell",
  pyd: "Python",
  tf: "HCL",
  hcl: "HCL",
  tfvars: "HCL",
  yml: "YAML",
  yaml: "YAML",
  toml: "TOML",
  ini: "INI",
  cfg: "INI",
  conf: "Config",
  xml: "XML",
  json: "JSON",
};

export const CONFIG_FILE_HINTS = {
  "package.json": {
    languages: ["JavaScript"],
    buildTools: ["npm scripts"],
    packageManagers: ["npm"],
  },
  "pnpm-lock.yaml": {
    languages: ["JavaScript"],
    buildTools: ["pnpm scripts"],
    packageManagers: ["pnpm"],
  },
  "yarn.lock": {
    languages: ["JavaScript"],
    buildTools: ["yarn scripts"],
    packageManagers: ["yarn"],
  },
  "bun.lockb": {
    languages: ["JavaScript"],
    buildTools: ["bun scripts"],
    packageManagers: ["bun"],
  },
  "requirements.txt": {
    languages: ["Python"],
    buildTools: ["pip"],
    packageManagers: ["pip"],
  },
  "pyproject.toml": {
    languages: ["Python"],
    buildTools: ["poetry/pdm/setuptools"],
    packageManagers: ["pip"],
  },
  "poetry.lock": {
    languages: ["Python"],
    buildTools: ["poetry"],
    packageManagers: ["poetry"],
  },
  "pom.xml": {
    languages: ["Java"],
    buildTools: ["Maven"],
    packageManagers: ["Maven"],
  },
  "build.gradle": {
    languages: ["Java", "Kotlin"],
    buildTools: ["Gradle"],
    packageManagers: ["Gradle"],
  },
  "build.gradle.kts": {
    languages: ["Java", "Kotlin"],
    buildTools: ["Gradle"],
    packageManagers: ["Gradle"],
  },
  "go.mod": {
    languages: ["Go"],
    buildTools: ["go toolchain"],
    packageManagers: ["Go modules"],
  },
  "cargo.toml": {
    languages: ["Rust"],
    buildTools: ["cargo"],
    packageManagers: ["cargo"],
  },
  "composer.json": {
    languages: ["PHP"],
    buildTools: ["composer"],
    packageManagers: ["composer"],
  },
  gemfile: {
    languages: ["Ruby"],
    buildTools: ["bundler"],
    packageManagers: ["bundler"],
  },
  "packages.config": {
    languages: ["C#"],
    buildTools: ["nuget/msbuild"],
    packageManagers: ["NuGet"],
  },
  "dockerfile": {
    languages: ["Docker"],
    buildTools: ["Docker"],
    packageManagers: [],
  },
  "docker-compose.yml": {
    languages: ["YAML"],
    buildTools: ["Docker Compose"],
    packageManagers: [],
  },
  "terraform.tf": {
    languages: ["HCL"],
    buildTools: ["Terraform"],
    packageManagers: [],
  },
};

export function normalizeFileName(path) {
  return String(path || "").split("/").pop()?.toLowerCase() || "";
}

export function getExtension(path) {
  const fileName = normalizeFileName(path);
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex === -1) return "";
  return fileName.slice(dotIndex + 1).toLowerCase();
}

export function isMinifiedFile(path) {
  const fileName = normalizeFileName(path);
  return /\.min\.(js|mjs|cjs|css)$/i.test(fileName);
}

export function isLikelyTextContent(content) {
  if (typeof content !== "string" || !content) return false;
  return !content.includes("\u0000");
}

export function detectLanguageFromPath(path) {
  const fileName = normalizeFileName(path);
  if (fileName === "dockerfile") return "Docker";
  const ext = getExtension(path);
  return LANGUAGE_BY_EXTENSION[ext] || "Unknown";
}
