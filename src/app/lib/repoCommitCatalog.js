export const REPO_COMMIT_STAT_ITEMS = [
  {
    id: "contribution",
    type: "contribution",
    metric: "",
    label: "Contribution Summary",
    description: "Recent commit and activity overview.",
    alt: "Contribution summary",
  },
  {
    id: "streak",
    type: "streak",
    metric: "",
    label: "Commit Streak",
    description: "Current and longest streak windows.",
    alt: "Commit streak",
  },
  {
    id: "last_repo",
    type: "repo",
    metric: "last_repo",
    label: "Last Worked Repo",
    description: "Most recently updated repository.",
    alt: "Last worked repository",
  },
  {
    id: "total_commits",
    type: "repo",
    metric: "total_commits",
    label: "Total Commits",
    description: "All commits across connected repositories.",
    alt: "Total commits",
  },
  {
    id: "active_days",
    type: "repo",
    metric: "active_days",
    label: "Active Days (30/90)",
    description: "Days with activity in recent windows.",
    alt: "Active days in 30 and 90 day windows",
  },
  {
    id: "top_repo",
    type: "repo",
    metric: "top_repo",
    label: "Top Repo (Recent)",
    description: "Highest activity repository in recent period.",
    alt: "Top repository by recent activity",
  },
];

export function getRepoCommitStatItemById(itemId) {
  const normalized = String(itemId || "").trim().toLowerCase();
  return (
    REPO_COMMIT_STAT_ITEMS.find((item) => item.id === normalized) ||
    REPO_COMMIT_STAT_ITEMS[0]
  );
}
