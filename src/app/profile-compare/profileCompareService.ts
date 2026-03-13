const GITHUB_API_BASE = "https://api.github.com";
const REST_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const README_CHECK_CONCURRENCY = 6;

export const SCORE_DIMENSIONS = [
  "productivity",
  "diversity",
  "popularity",
  "impact",
  "quality",
  "consistency",
] as const;

export type ScoreDimensionKey = (typeof SCORE_DIMENSIONS)[number];

export const SCORE_LABELS: Record<ScoreDimensionKey, string> = {
  productivity: "Productivity",
  diversity: "Diversity",
  popularity: "Popularity",
  impact: "Impact",
  quality: "Quality",
  consistency: "Consistency",
};

export const FINAL_SCORE_WEIGHTS: Record<ScoreDimensionKey, number> = {
  productivity: 0.2,
  diversity: 0.15,
  popularity: 0.2,
  impact: 0.2,
  quality: 0.15,
  consistency: 0.1,
};

type GitHubLicenseResponse = {
  key: string;
  name: string;
  spdx_id: string | null;
} | null;

type GitHubUserResponse = {
  login: string;
  name: string | null;
  avatar_url: string;
  followers: number;
  following: number;
  public_repos: number;
  created_at: string;
  bio: string | null;
  blog: string;
  location: string | null;
  html_url: string;
};

type GitHubRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  size: number;
  language: string | null;
  topics?: string[];
  open_issues_count: number;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  archived: boolean;
  license: GitHubLicenseResponse;
  fork: boolean;
};

export type ComparedRepository = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string;
  stars: number;
  forks: number;
  watchers: number;
  size: number;
  language: string;
  topics: string[];
  openIssues: number;
  createdAt: string;
  updatedAt: string;
  pushedAt: string;
  archived: boolean;
  licenseName: string;
  hasLicense: boolean;
  hasReadme: boolean;
  isFork: boolean;
};

export type LanguageBreakdown = {
  name: string;
  repos: number;
  stars: number;
  size: number;
  share: number;
};

export type DerivedMetrics = {
  totalRepositories: number;
  totalStars: number;
  totalForks: number;
  totalWatchers: number;
  totalRepoSize: number;
  averageStarsPerRepo: number;
  averageForksPerRepo: number;
  averageRepoSize: number;
  mostStarredRepo: ComparedRepository | null;
  mostForkedRepo: ComparedRepository | null;
  topRepositories: ComparedRepository[];
  topLanguages: LanguageBreakdown[];
  totalLanguagesUsed: number;
  languageBalanceScore: number;
  reposUpdatedLast6Months: number;
  reposUpdatedLast12Months: number;
  reposPushedLast90Days: number;
  reposWithReadme: number;
  reposWithDescription: number;
  reposWithLicense: number;
  reposWithTopics: number;
  reposOver50Stars: number;
  reposOver100Stars: number;
  readmeCoverage: number;
  descriptionCoverage: number;
  licenseCoverage: number;
  topicsCoverage: number;
  recent6MonthCoverage: number;
  recent12MonthCoverage: number;
  pushed90DayCoverage: number;
  forkRatio: number;
};

export type DeveloperDimensionScores = Record<ScoreDimensionKey, number>;

export type ComparedProfile = {
  basic: {
    username: string;
    name: string;
    avatar: string;
    followers: number;
    following: number;
    publicRepos: number;
    accountAgeDays: number;
    accountAgeLabel: string;
    profileUrl: string;
    bio: string;
    website: string;
    location: string;
    hasBio: boolean;
    hasWebsite: boolean;
    hasLocation: boolean;
  };
  metrics: DerivedMetrics;
  scores: DeveloperDimensionScores;
  developerScore: number;
};

export type ComparisonSummary = {
  productivityWinner: string;
  diversityWinner: string;
  popularityWinner: string;
  impactWinner: string;
  qualityWinner: string;
  consistencyWinner: string;
  overallWinner: string;
  categoryWinCounts: Record<string, number>;
  overallReason: string;
};

export type ProfileComparisonResult = {
  profiles: [ComparedProfile, ComparedProfile];
  summary: ComparisonSummary;
  summaryText: string;
  generatedAt: string;
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function roundToOne(value: number) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function normalizeUsername(value: string) {
  return String(value || "").trim().toLowerCase();
}

function toText(value: string | null | undefined) {
  return String(value || "").trim();
}

function toDisplayName(user: GitHubUserResponse) {
  return toText(user.name) || `@${user.login}`;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentage(part: number, total: number) {
  if (total <= 0) return 0;
  return clamp((part / total) * 100);
}

// Saturating normalization prevents one huge raw metric from dominating every score.
function saturatingScore(value: number, target: number) {
  if (target <= 0) return 0;
  const safeValue = Math.max(0, Number(value || 0));
  const normalized = Math.log1p(safeValue) / Math.log1p(target);
  return clamp(normalized * 100);
}

function normalizedEntropy(values: number[]) {
  const safeValues = values.filter((value) => value > 0);
  if (safeValues.length <= 1) return 0;

  const total = safeValues.reduce((sum, value) => sum + value, 0);
  const entropy = safeValues.reduce((sum, value) => {
    const probability = value / total;
    return sum - probability * Math.log2(probability);
  }, 0);

  return entropy / Math.log2(safeValues.length);
}

function daysSince(dateString: string) {
  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / MS_IN_DAY));
}

function latestActivityDate(repository: ComparedRepository) {
  const timestamps = [repository.updatedAt, repository.pushedAt, repository.createdAt]
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) {
    return "";
  }

  return new Date(Math.max(...timestamps)).toISOString();
}

function formatAccountAge(days: number) {
  const safeDays = Math.max(0, Math.floor(days));
  const years = Math.floor(safeDays / 365);
  const months = Math.floor((safeDays % 365) / 30);

  if (!years) return `${Math.max(1, months)} months`;
  if (!months) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years} year${years === 1 ? "" : "s"} ${months} month${months === 1 ? "" : "s"}`;
}

function calculateAccountAge(createdAt: string) {
  const createdDate = new Date(createdAt);
  if (Number.isNaN(createdDate.getTime())) {
    return { days: 0, label: "Unknown" };
  }

  const diffMs = Date.now() - createdDate.getTime();
  const days = Math.max(0, Math.floor(diffMs / MS_IN_DAY));
  return { days, label: formatAccountAge(days) };
}

function pickWinner(leftUsername: string, rightUsername: string, leftValue: number, rightValue: number) {
  if (leftValue === rightValue) return "Tie";
  return leftValue > rightValue ? leftUsername : rightUsername;
}

function toDisplayLabel(profile: ComparedProfile) {
  return profile.basic.name || `@${profile.basic.username}`;
}

function listToSentence(items: string[]) {
  if (!items.length) return "balanced strengths";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}
async function fetchGitHubJson<T>(url: string, notFoundMessage: string) {
  const response = await fetch(url, {
    headers: REST_HEADERS,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(notFoundMessage);
    }

    const errorMessage =
      payload && typeof payload === "object" && "message" in payload
        ? String(payload.message || "").trim()
        : "";

    if (response.status === 403 && errorMessage.toLowerCase().includes("rate limit")) {
      throw new Error("GitHub API rate limit reached. Please wait a moment and try again.");
    }

    throw new Error(errorMessage || `GitHub request failed with status ${response.status}.`);
  }

  return payload as T;
}

async function fetchUser(username: string) {
  return fetchGitHubJson<GitHubUserResponse>(
    `${GITHUB_API_BASE}/users/${username}`,
    `GitHub user "${username}" was not found.`
  );
}

async function fetchRepositories(username: string, publicRepoCount: number) {
  const pageCount = Math.max(1, Math.ceil(Math.max(publicRepoCount, 1) / 100));
  const repositories: GitHubRepoResponse[] = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const pageRepositories = await fetchGitHubJson<GitHubRepoResponse[]>(
      `${GITHUB_API_BASE}/users/${username}/repos?per_page=100&page=${page}&sort=updated`,
      `Repositories for "${username}" could not be loaded.`
    );

    repositories.push(...pageRepositories);

    if (pageRepositories.length < 100) {
      break;
    }
  }

  return repositories;
}

async function mapWithConcurrency<T, TResult>(
  values: T[],
  limit: number,
  worker: (value: T, index: number) => Promise<TResult>
) {
  if (!values.length) return [] as TResult[];

  const results = new Array<TResult>(values.length);
  let currentIndex = 0;

  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (currentIndex < values.length) {
      const localIndex = currentIndex;
      currentIndex += 1;
      results[localIndex] = await worker(values[localIndex], localIndex);
    }
  });

  await Promise.all(runners);
  return results;
}

async function checkRepositoryReadme(fullName: string) {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${fullName}/readme`, {
      headers: REST_HEADERS,
    });

    return response.ok;
  } catch {
    return false;
  }
}

function toRepository(repo: GitHubRepoResponse, hasReadme: boolean): ComparedRepository {
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    htmlUrl: repo.html_url,
    description: toText(repo.description),
    stars: Number(repo.stargazers_count || 0),
    forks: Number(repo.forks_count || 0),
    watchers: Number(repo.watchers_count || 0),
    size: Number(repo.size || 0),
    language: toText(repo.language) || "Unknown",
    topics: Array.isArray(repo.topics)
      ? repo.topics.map((topic) => toText(topic)).filter(Boolean)
      : [],
    openIssues: Number(repo.open_issues_count || 0),
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    archived: Boolean(repo.archived),
    licenseName: toText(repo.license?.name),
    hasLicense: Boolean(repo.license?.name),
    hasReadme,
    isFork: Boolean(repo.fork),
  };
}

async function enrichRepositories(rawRepositories: GitHubRepoResponse[]) {
  const readmeAvailability = await mapWithConcurrency(
    rawRepositories,
    README_CHECK_CONCURRENCY,
    async (repository) => checkRepositoryReadme(repository.full_name)
  );

  return rawRepositories.map((repository, index) =>
    toRepository(repository, Boolean(readmeAvailability[index]))
  );
}

function aggregateLanguages(repositories: ComparedRepository[]) {
  const languageMap = new Map<string, Omit<LanguageBreakdown, "share">>();

  repositories.forEach((repository) => {
    if (!repository.language || repository.language === "Unknown") {
      return;
    }

    const current = languageMap.get(repository.language) || {
      name: repository.language,
      repos: 0,
      stars: 0,
      size: 0,
    };

    current.repos += 1;
    current.stars += repository.stars;
    current.size += repository.size;
    languageMap.set(repository.language, current);
  });

  const entries = [...languageMap.values()].sort((left, right) => {
    if (right.repos !== left.repos) return right.repos - left.repos;
    if (right.stars !== left.stars) return right.stars - left.stars;
    return right.size - left.size;
  });

  const totalRepos = Math.max(1, entries.reduce((sum, entry) => sum + entry.repos, 0));

  return entries.map((entry) => ({
    ...entry,
    share: roundToOne((entry.repos / totalRepos) * 100),
  }));
}

function sortRepositoriesByImpact(repositories: ComparedRepository[]) {
  return [...repositories].sort((left, right) => {
    if (right.stars !== left.stars) return right.stars - left.stars;
    if (right.forks !== left.forks) return right.forks - left.forks;
    if (right.watchers !== left.watchers) return right.watchers - left.watchers;
    return right.size - left.size;
  });
}

function sortRepositoriesByForks(repositories: ComparedRepository[]) {
  return [...repositories].sort((left, right) => {
    if (right.forks !== left.forks) return right.forks - left.forks;
    if (right.stars !== left.stars) return right.stars - left.stars;
    return right.watchers - left.watchers;
  });
}

function deriveMetrics(repositories: ComparedRepository[]): DerivedMetrics {
  const topRepositories = sortRepositoriesByImpact(repositories).slice(0, 3);
  const mostStarredRepo = topRepositories[0] || null;
  const mostForkedRepo = sortRepositoriesByForks(repositories)[0] || null;
  const topLanguages = aggregateLanguages(repositories).slice(0, 5);
  const totalRepositories = repositories.length;
  const totalStars = repositories.reduce((sum, repository) => sum + repository.stars, 0);
  const totalForks = repositories.reduce((sum, repository) => sum + repository.forks, 0);
  const totalWatchers = repositories.reduce((sum, repository) => sum + repository.watchers, 0);
  const totalRepoSize = repositories.reduce((sum, repository) => sum + repository.size, 0);
  const averageStarsPerRepo = roundToOne(average(repositories.map((repository) => repository.stars)));
  const averageForksPerRepo = roundToOne(average(repositories.map((repository) => repository.forks)));
  const averageRepoSize = roundToOne(average(repositories.map((repository) => repository.size)));
  const reposUpdatedLast6Months = repositories.filter((repository) => daysSince(latestActivityDate(repository)) <= 183).length;
  const reposUpdatedLast12Months = repositories.filter((repository) => daysSince(latestActivityDate(repository)) <= 365).length;
  const reposPushedLast90Days = repositories.filter((repository) => daysSince(repository.pushedAt) <= 90).length;
  const reposWithReadme = repositories.filter((repository) => repository.hasReadme).length;
  const reposWithDescription = repositories.filter((repository) => Boolean(repository.description)).length;
  const reposWithLicense = repositories.filter((repository) => repository.hasLicense).length;
  const reposWithTopics = repositories.filter((repository) => repository.topics.length > 0).length;
  const reposOver50Stars = repositories.filter((repository) => repository.stars >= 50).length;
  const reposOver100Stars = repositories.filter((repository) => repository.stars >= 100).length;
  const readmeCoverage = roundToOne(percentage(reposWithReadme, totalRepositories));
  const descriptionCoverage = roundToOne(percentage(reposWithDescription, totalRepositories));
  const licenseCoverage = roundToOne(percentage(reposWithLicense, totalRepositories));
  const topicsCoverage = roundToOne(percentage(reposWithTopics, totalRepositories));
  const recent6MonthCoverage = roundToOne(percentage(reposUpdatedLast6Months, totalRepositories));
  const recent12MonthCoverage = roundToOne(percentage(reposUpdatedLast12Months, totalRepositories));
  const pushed90DayCoverage = roundToOne(percentage(reposPushedLast90Days, totalRepositories));
  const totalLanguagesUsed = aggregateLanguages(repositories).length;
  const languageBalanceScore = roundToOne(
    normalizedEntropy(aggregateLanguages(repositories).map((entry) => entry.repos)) * 100
  );
  const forkRatio = roundToOne(totalForks / Math.max(1, totalStars + totalForks));

  return {
    totalRepositories,
    totalStars,
    totalForks,
    totalWatchers,
    totalRepoSize,
    averageStarsPerRepo,
    averageForksPerRepo,
    averageRepoSize,
    mostStarredRepo,
    mostForkedRepo,
    topRepositories,
    topLanguages,
    totalLanguagesUsed,
    languageBalanceScore,
    reposUpdatedLast6Months,
    reposUpdatedLast12Months,
    reposPushedLast90Days,
    reposWithReadme,
    reposWithDescription,
    reposWithLicense,
    reposWithTopics,
    reposOver50Stars,
    reposOver100Stars,
    readmeCoverage,
    descriptionCoverage,
    licenseCoverage,
    topicsCoverage,
    recent6MonthCoverage,
    recent12MonthCoverage,
    pushed90DayCoverage,
    forkRatio,
  };
}
// Each dimension stays on a 0-100 scale so the final weighted score remains interpretable.
function scoreProductivity(metrics: DerivedMetrics) {
  const repoOutputScore = saturatingScore(metrics.totalRepositories, 60);
  const recentSixMonthScore = saturatingScore(metrics.reposUpdatedLast6Months, 20);
  const recentTwelveMonthScore = saturatingScore(metrics.reposUpdatedLast12Months, 35);
  // Commit counts require many extra per-repo API calls, so recent update coverage is used as a lightweight activity proxy.
  const updateFrequencyScore = roundToOne(
    metrics.recent6MonthCoverage * 0.55 + metrics.recent12MonthCoverage * 0.45
  );

  return roundToOne(
    repoOutputScore * 0.3 +
      recentSixMonthScore * 0.35 +
      recentTwelveMonthScore * 0.2 +
      updateFrequencyScore * 0.15
  );
}

function scoreDiversity(metrics: DerivedMetrics) {
  const languageCountScore = saturatingScore(metrics.totalLanguagesUsed, 12);
  return roundToOne(languageCountScore * 0.6 + metrics.languageBalanceScore * 0.4);
}

function scorePopularity(metrics: DerivedMetrics, followers: number) {
  const starsScore = saturatingScore(metrics.totalStars, 5000);
  const forksScore = saturatingScore(metrics.totalForks, 1500);
  const followersScore = saturatingScore(followers, 3000);
  const watchersScore = saturatingScore(metrics.totalWatchers, 5000);

  return roundToOne(
    starsScore * 0.5 +
      forksScore * 0.25 +
      followersScore * 0.15 +
      watchersScore * 0.1
  );
}

function scoreImpact(metrics: DerivedMetrics) {
  const averageStarsScore = saturatingScore(metrics.averageStarsPerRepo, 40);
  const overFiftyScore = saturatingScore(metrics.reposOver50Stars, 8);
  const overHundredScore = saturatingScore(metrics.reposOver100Stars, 5);
  const forkRatioScore = saturatingScore(metrics.forkRatio, 0.2);

  return roundToOne(
    averageStarsScore * 0.35 +
      overFiftyScore * 0.25 +
      overHundredScore * 0.25 +
      forkRatioScore * 0.15
  );
}

function scoreQuality(metrics: DerivedMetrics) {
  const averageSizeScore = saturatingScore(metrics.averageRepoSize, 900);

  return roundToOne(
    metrics.descriptionCoverage * 0.22 +
      metrics.readmeCoverage * 0.28 +
      metrics.licenseCoverage * 0.18 +
      metrics.topicsCoverage * 0.16 +
      averageSizeScore * 0.16
  );
}

function scoreConsistency(metrics: DerivedMetrics, accountAgeDays: number) {
  const accountAgeScore = saturatingScore(accountAgeDays / 365, 8);

  return roundToOne(
    accountAgeScore * 0.25 +
      metrics.recent12MonthCoverage * 0.35 +
      metrics.recent6MonthCoverage * 0.25 +
      metrics.pushed90DayCoverage * 0.15
  );
}

function buildDimensionScores(profile: { accountAgeDays: number; followers: number; metrics: DerivedMetrics }) {
  return {
    productivity: scoreProductivity(profile.metrics),
    diversity: scoreDiversity(profile.metrics),
    popularity: scorePopularity(profile.metrics, profile.followers),
    impact: scoreImpact(profile.metrics),
    quality: scoreQuality(profile.metrics),
    consistency: scoreConsistency(profile.metrics, profile.accountAgeDays),
  } satisfies DeveloperDimensionScores;
}

function computeDeveloperScore(scores: DeveloperDimensionScores) {
  return roundToOne(
    SCORE_DIMENSIONS.reduce((sum, dimension) => {
      return sum + scores[dimension] * FINAL_SCORE_WEIGHTS[dimension];
    }, 0)
  );
}

function dimensionWinnerKey(dimension: ScoreDimensionKey) {
  return `${dimension}Winner` as const;
}

function collectWinningDimensions(summary: ComparisonSummary, username: string) {
  return SCORE_DIMENSIONS.filter(
    (dimension) => summary[dimensionWinnerKey(dimension)] === username
  ).map((dimension) => SCORE_LABELS[dimension].toLowerCase());
}

function buildOverallReason(
  summary: ComparisonSummary,
  left: ComparedProfile,
  right: ComparedProfile
) {
  if (summary.overallWinner === "Tie") {
    return `Both profiles finished on the same weighted developer score (${left.developerScore}/100), so the comparison ends in a tie.`;
  }

  const winner = summary.overallWinner === left.basic.username ? left : right;
  const runnerUp = winner === left ? right : left;
  const winningDimensions = collectWinningDimensions(summary, winner.basic.username);
  const scoreGap = roundToOne(winner.developerScore - runnerUp.developerScore);

  return `${toDisplayLabel(winner)} wins overall with a ${winner.developerScore}/100 developer score, beating ${toDisplayLabel(runnerUp)} by ${scoreGap} points through stronger ${listToSentence(winningDimensions)}.`;
}

function buildSummaryText(
  left: ComparedProfile,
  right: ComparedProfile,
  summary: ComparisonSummary
) {
  const impactLeader =
    summary.impactWinner === left.basic.username
      ? left
      : summary.impactWinner === right.basic.username
        ? right
        : null;
  const diversityLeader =
    summary.diversityWinner === left.basic.username
      ? left
      : summary.diversityWinner === right.basic.username
        ? right
        : null;
  const qualityLeader =
    summary.qualityWinner === left.basic.username
      ? left
      : summary.qualityWinner === right.basic.username
        ? right
        : null;

  const impactSentence = impactLeader
    ? `${toDisplayLabel(impactLeader)} demonstrates stronger open-source impact with ${impactLeader.metrics.reposOver50Stars} repositories above 50 stars and ${impactLeader.metrics.averageStarsPerRepo} average stars per repo.`
    : `${toDisplayLabel(left)} and ${toDisplayLabel(right)} are evenly matched on impact.`;

  const diversitySentence = diversityLeader
    ? `${toDisplayLabel(diversityLeader)} shows broader technological range across ${diversityLeader.metrics.totalLanguagesUsed} languages with a balance score of ${diversityLeader.metrics.languageBalanceScore}.`
    : "Both developers show a similarly balanced language mix.";

  const qualitySentence = qualityLeader
    ? `${toDisplayLabel(qualityLeader)} publishes more complete repositories, with stronger README, license, and topic coverage.`
    : "Repository quality coverage is closely matched between both profiles.";

  const overallSentence =
    summary.overallWinner === "Tie"
      ? "The final weighted developer score is tied, so neither profile takes the overall edge."
      : `${toDisplayLabel(summary.overallWinner === left.basic.username ? left : right)} takes the overall lead on the weighted multi-factor developer score.`;

  return `${impactSentence} ${diversitySentence} ${qualitySentence} ${overallSentence}`;
}
async function buildComparedProfile(usernameInput: string): Promise<ComparedProfile> {
  const username = normalizeUsername(usernameInput);
  const user = await fetchUser(username);
  const rawRepositories = await fetchRepositories(user.login, Number(user.public_repos || 0));
  const repositories = await enrichRepositories(rawRepositories);
  const accountAge = calculateAccountAge(user.created_at);
  const metrics = deriveMetrics(repositories);

  const basic = {
    username: user.login.toLowerCase(),
    name: toDisplayName(user),
    avatar: user.avatar_url,
    followers: Number(user.followers || 0),
    following: Number(user.following || 0),
    publicRepos: Number(user.public_repos || repositories.length),
    accountAgeDays: accountAge.days,
    accountAgeLabel: accountAge.label,
    profileUrl: user.html_url,
    bio: toText(user.bio),
    website: toText(user.blog),
    location: toText(user.location),
    hasBio: Boolean(toText(user.bio)),
    hasWebsite: Boolean(toText(user.blog)),
    hasLocation: Boolean(toText(user.location)),
  };

  const scores = buildDimensionScores({
    accountAgeDays: basic.accountAgeDays,
    followers: basic.followers,
    metrics,
  });

  return {
    basic,
    metrics,
    scores,
    developerScore: computeDeveloperScore(scores),
  };
}

export async function compareProfiles(
  leftUsernameInput: string,
  rightUsernameInput: string
): Promise<ProfileComparisonResult> {
  const leftUsername = normalizeUsername(leftUsernameInput);
  const rightUsername = normalizeUsername(rightUsernameInput);

  if (!leftUsername || !rightUsername) {
    throw new Error("Both GitHub usernames are required.");
  }

  if (leftUsername === rightUsername) {
    throw new Error("Enter two different GitHub usernames to compare.");
  }

  const [leftProfile, rightProfile] = await Promise.all([
    buildComparedProfile(leftUsername),
    buildComparedProfile(rightUsername),
  ]);

  const summary: ComparisonSummary = {
    productivityWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.productivity,
      rightProfile.scores.productivity
    ),
    diversityWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.diversity,
      rightProfile.scores.diversity
    ),
    popularityWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.popularity,
      rightProfile.scores.popularity
    ),
    impactWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.impact,
      rightProfile.scores.impact
    ),
    qualityWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.quality,
      rightProfile.scores.quality
    ),
    consistencyWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.scores.consistency,
      rightProfile.scores.consistency
    ),
    overallWinner: pickWinner(
      leftProfile.basic.username,
      rightProfile.basic.username,
      leftProfile.developerScore,
      rightProfile.developerScore
    ),
    categoryWinCounts: {
      [leftProfile.basic.username]: 0,
      [rightProfile.basic.username]: 0,
    },
    overallReason: "",
  };

  [
    summary.productivityWinner,
    summary.diversityWinner,
    summary.popularityWinner,
    summary.impactWinner,
    summary.qualityWinner,
    summary.consistencyWinner,
  ].forEach((winner) => {
    if (winner === "Tie") return;
    summary.categoryWinCounts[winner] = Number(summary.categoryWinCounts[winner] || 0) + 1;
  });

  summary.overallReason = buildOverallReason(summary, leftProfile, rightProfile);

  return {
    profiles: [leftProfile, rightProfile],
    summary,
    summaryText: buildSummaryText(leftProfile, rightProfile, summary),
    generatedAt: new Date().toISOString(),
  };
}
