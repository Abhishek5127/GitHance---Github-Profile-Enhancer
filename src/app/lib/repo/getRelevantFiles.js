// src/lib/repo/getRelevantFiles.js

const IGNORED_FOLDERS = [
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".git",
  ".github",
  ".vscode",
];

const WEB_PROJECT_INDICATORS = [
  "package.json",
  "next.config.js",
  "next.config.ts",
  "vite.config.js",
  "vite.config.ts",
  "webpack.config.js",
];

const WEB_IMPORTANT_FILES = [
  "README.md",
  "package.json",
  ".env.example",
];

const WEB_IMPORTANT_FOLDERS = [
  "src",
  "app",
  "pages",
  "public",
];

function removeJunk(tree) {
  return tree.filter(item =>
    !IGNORED_FOLDERS.some(folder =>
      item.path === folder || item.path.startsWith(folder + "/")
    )
  );
}

function isWebProject(tree) {
  return tree.some(item =>
    WEB_PROJECT_INDICATORS.includes(item.path)
  );
}

function filterWebFiles(tree) {
  return tree.filter(item => {
    // keep important root files
    if (WEB_IMPORTANT_FILES.includes(item.path)) {
      return true;
    }

    // keep files inside important folders
    return WEB_IMPORTANT_FOLDERS.some(folder =>
      item.path.startsWith(folder + "/")
    );
  });
}

export default function getRelevantFiles(projectRoot) {
  if (!Array.isArray(projectRoot)) return [];

  const cleanedTree = removeJunk(projectRoot);

  if (isWebProject(cleanedTree)) {
    return filterWebFiles(cleanedTree);
  }

  // fallback: only README
  return cleanedTree.filter(item => item.path === "README.md");
}
