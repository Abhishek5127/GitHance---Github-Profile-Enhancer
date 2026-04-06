const PROFILE_BUILDER_CONTEXT_STORAGE_KEY = "githance:profile-builder:context:username";
const PROFILE_BUILDER_CONTEXT_COMMIT_STATS_STORAGE_KEY =
  "githance:profile-builder:context:commit-stats:v1";
const PROFILE_BUILDER_CONTEXT_COMMIT_STATS_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function normalizeProfileBuilderContextUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

export function loadProfileBuilderContextUsername() {
  if (typeof window === "undefined") return "";

  try {
    return normalizeProfileBuilderContextUsername(
      window.localStorage.getItem(PROFILE_BUILDER_CONTEXT_STORAGE_KEY)
    );
  } catch {
    return "";
  }
}

export function saveProfileBuilderContextUsername(value) {
  const normalized = normalizeProfileBuilderContextUsername(value);
  if (typeof window === "undefined") return normalized;

  try {
    if (normalized) {
      window.localStorage.setItem(PROFILE_BUILDER_CONTEXT_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(PROFILE_BUILDER_CONTEXT_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures and continue with in-memory flow.
  }

  return normalized;
}

function normalizeProfileBuilderCommitStatsSnapshot(snapshot = {}, username = "") {
  const normalizedUsername = normalizeProfileBuilderContextUsername(
    snapshot?.github_username || username
  );
  if (!normalizedUsername) return null;

  return {
    github_username: normalizedUsername,
    total_commits: Number(snapshot?.total_commits || 0),
    current_streak: Number(snapshot?.current_streak || 0),
    longest_streak: Number(snapshot?.longest_streak || 0),
    last_repo: String(snapshot?.last_repo || "").trim(),
    active_days_30: Number(snapshot?.active_days_30 || 0),
    active_days_90: Number(snapshot?.active_days_90 || 0),
    top_repo_recent: String(snapshot?.top_repo_recent || "").trim(),
    recent_commits_7: Number(snapshot?.recent_commits_7 || 0),
    recent_commits_30: Number(snapshot?.recent_commits_30 || 0),
    last_updated: String(snapshot?.last_updated || "").trim(),
    installation_id: Number(snapshot?.installation_id || 0) || null,
  };
}

export function loadProfileBuilderContextCommitStatsSnapshot(
  username = "",
  { maxAgeMs = PROFILE_BUILDER_CONTEXT_COMMIT_STATS_MAX_AGE_MS } = {}
) {
  const normalizedUsername = normalizeProfileBuilderContextUsername(username);
  if (typeof window === "undefined" || !normalizedUsername) return null;

  try {
    const raw = window.localStorage.getItem(
      PROFILE_BUILDER_CONTEXT_COMMIT_STATS_STORAGE_KEY
    );
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const storedUsername = normalizeProfileBuilderContextUsername(parsed?.username);
    if (!storedUsername || storedUsername !== normalizedUsername) {
      return null;
    }

    const savedAt = Date.parse(String(parsed?.savedAt || ""));
    if (
      Number.isFinite(maxAgeMs) &&
      maxAgeMs > 0 &&
      Number.isFinite(savedAt) &&
      Date.now() - savedAt > maxAgeMs
    ) {
      window.localStorage.removeItem(PROFILE_BUILDER_CONTEXT_COMMIT_STATS_STORAGE_KEY);
      return null;
    }

    return normalizeProfileBuilderCommitStatsSnapshot(
      parsed?.snapshot,
      normalizedUsername
    );
  } catch {
    return null;
  }
}

export function saveProfileBuilderContextCommitStatsSnapshot({
  username = "",
  snapshot = null,
} = {}) {
  const normalizedSnapshot = normalizeProfileBuilderCommitStatsSnapshot(
    snapshot,
    username
  );
  if (typeof window === "undefined" || !normalizedSnapshot) {
    return normalizedSnapshot;
  }

  try {
    window.localStorage.setItem(
      PROFILE_BUILDER_CONTEXT_COMMIT_STATS_STORAGE_KEY,
      JSON.stringify({
        username: normalizedSnapshot.github_username,
        savedAt: new Date().toISOString(),
        snapshot: normalizedSnapshot,
      })
    );
  } catch {
    // Ignore storage failures and continue with the in-memory snapshot.
  }

  return normalizedSnapshot;
}

