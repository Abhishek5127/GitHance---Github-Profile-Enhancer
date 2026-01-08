/**
 * Detect project roots and group files by project
 * Supports multi-project (monorepo-style) repositories
 */

const PROJECT_INDICATOR_FILES = [
  "package.json",
  // later you can add:
  // "pyproject.toml",
  // "go.mod",
  // "pom.xml",
];

/**
 * Step 1: Detect project roots
 * A project root is any folder that contains an indicator file
 */

function detectProjectRoots(tree){
  const roots = new Set();

  tree.forEach((item) => {
    for (const indicator of PROJECT_INDICATOR_FILES) {
      if (item.path.endsWith(`/${indicator}`)) {
        // e.g. "ai-resume-frontend/package.json" → "ai-resume-frontend"
        const root = item.path.split("/")[0];
        roots.add(root);
      }

      // root-level project (rare but valid)
      if (item.path === indicator) {
        roots.add(".");
      }
    }
  });

  return Array.from(roots);
}

/**
 * Step 2: Group files by detected project roots
 */
function groupFilesByProject(tree, projectRoots) {
  const groups = {};

  projectRoots.forEach((root) => {
    groups[root] = [];
  });

  tree.forEach((item) => {
    for (const root of projectRoots) {
      if (
        root === "." ||
        item.path === root ||
        item.path.startsWith(root + "/")
      ) {
        groups[root].push(item);
        break;
      }
    }
  });

  return groups;
}

/**
 * Main function
 * repoTree → { projectRoot: [files] }
 */
export default function detectAndGroupProjects(repoTree) {
  if (!Array.isArray(repoTree)) return {};

  const projectRoots = detectProjectRoots(repoTree);

  // fallback: no detected projects → treat entire repo as one project
  if (projectRoots.length === 0) {
    return {
      ".": repoTree,
    };
  }
  
  return groupFilesByProject(repoTree, projectRoots);
}
