const README_PREVIEW_STORAGE_KEY = "githance:readme-preview:v1";

function sanitizeSegment(value, fallback = "readme") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || fallback;
}

export function buildReadmeDownloadFilename(payload = {}) {
  const owner = sanitizeSegment(payload?.owner, "github");
  const repo = sanitizeSegment(payload?.repo, sanitizeSegment(payload?.title, "readme"));
  return `${owner}-${repo}-README.md`;
}

export function normalizeReadmePreviewPayload(payload = {}) {
  const markdown = String(payload?.markdown || "");
  const title = String(payload?.title || payload?.repo || payload?.owner || "README").trim() || "README";
  const owner = String(payload?.owner || "").trim().toLowerCase();
  const repo = String(payload?.repo || "").trim();
  const source = String(payload?.source || "builder").trim().toLowerCase() || "builder";
  const backHref = String(payload?.backHref || "/profile-builder").trim() || "/profile-builder";
  const backLabel = String(payload?.backLabel || "Back").trim() || "Back";

  return {
    markdown,
    title,
    owner,
    repo,
    source,
    backHref,
    backLabel,
    generatedAt: String(payload?.generatedAt || new Date().toISOString()),
    filename: buildReadmeDownloadFilename({ owner, repo, title }),
  };
}

export function saveReadmePreviewPayload(payload = {}) {
  if (typeof window === "undefined") {
    return normalizeReadmePreviewPayload(payload);
  }

  const normalized = normalizeReadmePreviewPayload(payload);
  window.sessionStorage.setItem(README_PREVIEW_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function loadReadmePreviewPayload() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(README_PREVIEW_STORAGE_KEY);
    if (!raw) return null;
    return normalizeReadmePreviewPayload(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function clearReadmePreviewPayload() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(README_PREVIEW_STORAGE_KEY);
}
