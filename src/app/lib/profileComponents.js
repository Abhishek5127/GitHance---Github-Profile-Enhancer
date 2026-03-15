export const PROFILE_COMPONENTS = [
  {
    id: "liveHeader",
    type: "typing",
    title: "Header Intro",
    component: "HeaderBlock",
  },
  {
    id: "bio",
    title: "Short Bio",
    component: "BioBlock",
  },
  {
    id: "contri",
    title: "Short Bio",
    component: "ContributionGraph",
  },
];

export const PROFILE_BUILDER_PLACEHOLDER_USERNAME = "your-github-username";

export function isProfileBuilderPlaceholderUsername(value) {
  return (
    String(value || "").trim().toLowerCase() ===
    PROFILE_BUILDER_PLACEHOLDER_USERNAME
  );
}

export function resolveProfileBuilderUsername(value, fallback = "") {
  const normalizedValue = String(value || "").trim().toLowerCase();
  const normalizedFallback = String(fallback || "").trim().toLowerCase();

  if (
    !normalizedValue ||
    isProfileBuilderPlaceholderUsername(normalizedValue)
  ) {
    return normalizedFallback;
  }

  return normalizedValue;
}
