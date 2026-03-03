import {
  BINARY_EXTENSIONS,
  COMPILED_EXTENSIONS,
  DEVELOPER_SOURCE_EXTENSIONS,
  DEVELOPER_SOURCE_FILE_NAMES,
  EXCLUDED_DIRECTORIES,
  LOCK_FILE_NAMES,
  getExtension,
  isMinifiedFile,
  normalizeFileName,
} from "@/app/lib/security/config";

function shouldIgnoreDirectory(path) {
  const segments = String(path || "").toLowerCase().split("/");
  return segments.some((segment) => EXCLUDED_DIRECTORIES.has(segment));
}

function isGeneratedFile(path) {
  const lowerPath = String(path || "").toLowerCase();
  return (
    lowerPath.includes("/generated/") ||
    lowerPath.includes("/__generated__/") ||
    lowerPath.endsWith(".generated.ts") ||
    lowerPath.endsWith(".generated.js") ||
    lowerPath.endsWith(".g.dart") ||
    lowerPath.endsWith(".designer.cs")
  );
}

function isLockFile(path) {
  const fileName = normalizeFileName(path);
  return LOCK_FILE_NAMES.has(fileName);
}

function isCompiledArtifact(path) {
  const ext = getExtension(path);
  if (!ext) return false;
  return COMPILED_EXTENSIONS.has(ext);
}

function isBinaryAsset(path) {
  const ext = getExtension(path);
  if (!ext) return false;
  return BINARY_EXTENSIONS.has(ext);
}

function isDeveloperOwnedFile(path) {
  const fileName = normalizeFileName(path);
  if (DEVELOPER_SOURCE_FILE_NAMES.has(fileName)) return true;
  const ext = getExtension(path);
  return DEVELOPER_SOURCE_EXTENSIONS.has(ext);
}

function classifySkipReason(item, maxFileSizeBytes) {
  const path = item?.path || "";

  if (!path || item?.type !== "file") return "non_file";
  if (shouldIgnoreDirectory(path)) return "excluded_directory";
  if (isGeneratedFile(path)) return "generated_code";
  if (isLockFile(path)) return "lock_file";
  if (isMinifiedFile(path)) return "minified";
  if (isCompiledArtifact(path)) return "compiled_artifact";
  if (isBinaryAsset(path)) return "binary_asset";
  if (Number(item?.size || 0) > maxFileSizeBytes) return "too_large_precheck";
  if (!isDeveloperOwnedFile(path)) return "non_source";
  return null;
}

function initSkippedSummary() {
  return {
    excluded_directory: 0,
    generated_code: 0,
    lock_file: 0,
    minified: 0,
    compiled_artifact: 0,
    binary_asset: 0,
    too_large_precheck: 0,
    non_source: 0,
    non_file: 0,
  };
}

export function filterDeveloperFiles(repoTree, options = {}) {
  const maxFileSizeBytes = Number.isFinite(options.maxFileSizeBytes)
    ? Number(options.maxFileSizeBytes)
    : 350_000;
  const maxAnalyzedFiles = Number.isFinite(options.maxAnalyzedFiles)
    ? Number(options.maxAnalyzedFiles)
    : 450;

  const skipped = initSkippedSummary();
  const candidates = [];

  for (const item of repoTree || []) {
    const reason = classifySkipReason(item, maxFileSizeBytes);
    if (reason) {
      if (skipped[reason] !== undefined) skipped[reason] += 1;
      continue;
    }
    candidates.push({
      path: item.path,
      type: "file",
      size: Number(item.size || 0),
    });
  }

  candidates.sort((a, b) => a.path.localeCompare(b.path));

  const filesToAnalyze = candidates.slice(0, maxAnalyzedFiles);
  const truncated = candidates.length > filesToAnalyze.length;

  return {
    developerFiles: filesToAnalyze,
    developerFileCount: candidates.length,
    truncated,
    skipped,
  };
}
