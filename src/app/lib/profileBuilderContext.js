const PROFILE_BUILDER_CONTEXT_STORAGE_KEY = "githance:profile-builder:context:username";

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
