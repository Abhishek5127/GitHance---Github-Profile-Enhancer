export function resolveSessionUserId(session) {
  return String(
    session?.userId || session?.user?.email || session?.email || ""
  )
    .trim()
    .toLowerCase();
}

export function resolveSessionGithubUsername(session) {
  return String(session?.githubUsername || session?.username || "")
    .trim()
    .toLowerCase();
}

export function hasLinkedGithubAccount(session) {
  return Boolean(resolveSessionGithubUsername(session));
}
