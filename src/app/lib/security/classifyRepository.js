import {
  CONFIG_FILE_HINTS,
  detectLanguageFromPath,
  normalizeFileName,
} from "@/app/lib/security/config";

function addManyToSet(set, values) {
  for (const value of values || []) {
    if (value) set.add(value);
  }
}

function toSortedCounts(countMap) {
  return Array.from(countMap.entries())
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => b.files - a.files || a.name.localeCompare(b.name));
}

function getConfigHint(fileName) {
  const lower = normalizeFileName(fileName);
  if (CONFIG_FILE_HINTS[lower]) return CONFIG_FILE_HINTS[lower];

  if (lower.endsWith(".csproj") || lower.endsWith(".fsproj") || lower.endsWith(".vbproj")) {
    return {
      languages: ["C#"],
      buildTools: ["MSBuild"],
      packageManagers: ["NuGet"],
    };
  }

  if (lower === "gradle.properties" || lower === "settings.gradle" || lower === "settings.gradle.kts") {
    return {
      languages: ["Java", "Kotlin"],
      buildTools: ["Gradle"],
      packageManagers: ["Gradle"],
    };
  }

  if (lower === "terraform.tf" || lower.endsWith(".tf")) {
    return {
      languages: ["HCL"],
      buildTools: ["Terraform"],
      packageManagers: [],
    };
  }

  return null;
}

export function classifyRepository(repoTree) {
  const languageCounts = new Map();
  const detectedConfigs = new Set();
  const buildTools = new Set();
  const packageManagers = new Set();

  for (const item of repoTree || []) {
    if (!item || item.type !== "file" || typeof item.path !== "string") continue;

    const language = detectLanguageFromPath(item.path);
    if (language && language !== "Unknown") {
      languageCounts.set(language, (languageCounts.get(language) || 0) + 1);
    }

    const fileName = normalizeFileName(item.path);
    const hint = getConfigHint(fileName);
    if (hint) {
      detectedConfigs.add(fileName);
      addManyToSet(buildTools, hint.buildTools);
      addManyToSet(packageManagers, hint.packageManagers);
      for (const hintedLanguage of hint.languages || []) {
        languageCounts.set(
          hintedLanguage,
          (languageCounts.get(hintedLanguage) || 0) + 2
        );
      }
    }
  }

  const languageBreakdown = toSortedCounts(languageCounts);
  const primaryLanguages = languageBreakdown.slice(0, 3).map((entry) => entry.name);

  return {
    primary_languages: primaryLanguages,
    language_breakdown: languageBreakdown,
    build_tools: Array.from(buildTools).sort((a, b) => a.localeCompare(b)),
    package_managers: Array.from(packageManagers).sort((a, b) => a.localeCompare(b)),
    detected_config_files: Array.from(detectedConfigs).sort((a, b) => a.localeCompare(b)),
  };
}
