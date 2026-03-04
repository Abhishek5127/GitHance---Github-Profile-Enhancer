import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const DAY_MS = 24 * 60 * 60 * 1000;
const GITHUB_REST_URL = "https://api.github.com";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GITHUB_API_VERSION = "2022-11-28";
const MAX_REPO_PAGES = 5;
const REPOS_PER_PAGE = 100;
const EVENTS_PER_PAGE = 100;
const MONTHS_FOR_ACTIVITY = 12;
const MONTHS_FOR_LANGUAGE_ACTIVITY = 6;

const LANGUAGE_COLORS = [
  "#60a5fa",
  "#34d399",
  "#f59e0b",
  "#f97316",
  "#22d3ee",
  "#f43f5e",
  "#a78bfa",
  "#10b981",
];

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const YEARLY_CONTRIBUTIONS_QUERY = `
  query DashboardContributions($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      createdAt
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
        commitContributionsByRepository(maxRepositories: 10) {
          repository {
            name
            nameWithOwner
            url
          }
          contributions(first: 1) {
            totalCount
          }
        }
      }
    }
  }
`;

function toHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toDate(value) {
  const parsed = new Date(value || "");
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIsoDay(value) {
  const parsed = toDate(value);
  if (!parsed) return "";
  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

function toMonthKey(value) {
  const parsed = toDate(value);
  if (!parsed) return "";
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`;
}

function toMonthLabel(monthKey) {
  const [yearText, monthText] = String(monthKey || "").split("-");
  const year = Number(yearText);
  const month = Number(monthText) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return "";
  }

  return new Date(Date.UTC(year, month, 1)).toLocaleString("en-US", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function dedupeById(items = []) {
  const seen = new Set();
  const output = [];

  items.forEach((item) => {
    const id = String(item?.id || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    output.push(item);
  });

  return output;
}

function monthWindowKeys(monthCount = 12) {
  const now = new Date();
  const output = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
    const cursor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - index, 1)
    );
    output.push(toMonthKey(cursor.toISOString()));
  }

  return output;
}

function dayGap(fromDay, toDay) {
  const from = Date.parse(`${fromDay}T00:00:00.000Z`);
  const to = Date.parse(`${toDay}T00:00:00.000Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.round((to - from) / DAY_MS);
}

function computeStreaks(days = []) {
  const activeDays = days
    .filter((entry) => safeNumber(entry?.count, 0) > 0)
    .map((entry) => String(entry?.date || ""))
    .filter(Boolean)
    .sort();

  if (!activeDays.length) {
    return {
      current: 0,
      longest: 0,
    };
  }

  let longest = 1;
  let running = 1;

  for (let index = 1; index < activeDays.length; index += 1) {
    if (dayGap(activeDays[index - 1], activeDays[index]) === 1) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  const activeSet = new Set(activeDays);
  const today = new Date();
  const todayIso = toIsoDay(today.toISOString());
  const yesterday = new Date(today.getTime() - DAY_MS);
  const yesterdayIso = toIsoDay(yesterday.toISOString());
  let cursor = activeSet.has(todayIso) ? new Date(today) : new Date(yesterday);
  let current = 0;

  if (!activeSet.has(todayIso) && !activeSet.has(yesterdayIso)) {
    return {
      current: 0,
      longest,
    };
  }

  while (true) {
    const key = toIsoDay(cursor.toISOString());
    if (!activeSet.has(key)) break;
    current += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  return {
    current,
    longest,
  };
}

function flattenContributionDays(calendarWeeks = []) {
  const entries = [];
  const seen = new Set();

  (Array.isArray(calendarWeeks) ? calendarWeeks : []).forEach((week) => {
    const days = Array.isArray(week?.contributionDays) ? week.contributionDays : [];

    days.forEach((day) => {
      const iso = toIsoDay(day?.date);
      if (!iso || seen.has(iso)) return;
      seen.add(iso);
      entries.push({
        date: iso,
        count: Math.max(0, Math.floor(safeNumber(day?.contributionCount, 0))),
      });
    });
  });

  return entries.sort((a, b) => a.date.localeCompare(b.date));
}

function buildWeeklyActivity(days = []) {
  const buckets = Array.from({ length: 7 }, (_, index) => ({
    label: WEEKDAY_LABELS[index],
    value: 0,
  }));

  days.forEach((entry) => {
    const parsed = toDate(entry?.date);
    if (!parsed) return;
    const weekday = parsed.getUTCDay();
    buckets[weekday].value += Math.max(0, Math.floor(safeNumber(entry?.count, 0)));
  });

  return buckets;
}

function buildMonthlyContributionTrend(days = []) {
  const keys = monthWindowKeys(MONTHS_FOR_ACTIVITY);
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));

  days.forEach((entry) => {
    const monthKey = toMonthKey(entry?.date);
    if (!monthKey || !(monthKey in totals)) return;
    totals[monthKey] += Math.max(0, Math.floor(safeNumber(entry?.count, 0)));
  });

  return keys.map((monthKey) => ({
    key: monthKey,
    label: toMonthLabel(monthKey),
    value: totals[monthKey],
  }));
}

function computeConsistencyScore(days = []) {
  const safeDays = Array.isArray(days) ? days : [];
  if (!safeDays.length) return 0;

  const trackedDays = safeDays.length;
  const activeDays = safeDays.filter((entry) => safeNumber(entry?.count, 0) > 0).length;
  const activeRatio = activeDays / Math.max(1, trackedDays);

  const weeklyTotals = new Map();
  safeDays.forEach((entry) => {
    const parsed = toDate(entry?.date);
    if (!parsed) return;

    const day = parsed.getUTCDay();
    const weekStart = new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate() - day)
    );
    const weekKey = toIsoDay(weekStart.toISOString());
    weeklyTotals.set(
      weekKey,
      safeNumber(weeklyTotals.get(weekKey), 0) + Math.max(0, safeNumber(entry?.count, 0))
    );
  });

  const values = [...weeklyTotals.values()];
  if (!values.length) return Math.round(activeRatio * 100);

  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  const variability = mean > 0 ? standardDeviation / mean : 1;
  const stability = 1 - clamp(variability, 0, 1);

  return Math.round(clamp((activeRatio * 0.7 + stability * 0.3) * 100, 0, 100));
}

function buildLanguageDistribution(repos = []) {
  const totals = new Map();

  repos
    .filter((repo) => !repo?.fork)
    .forEach((repo) => {
      const language = String(repo?.language || "").trim();
      if (!language) return;
      const weight = Math.max(1, Math.floor(safeNumber(repo?.size, 1)));
      totals.set(language, safeNumber(totals.get(language), 0) + weight);
    });

  const totalWeight = [...totals.values()].reduce((sum, value) => sum + value, 0);
  if (!totalWeight) return [];

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value], index) => ({
      name,
      value,
      percent: Math.round((value / totalWeight) * 1000) / 10,
      color: LANGUAGE_COLORS[index % LANGUAGE_COLORS.length],
    }));
}

function buildRepositoryCreationTrend(repos = []) {
  const keys = monthWindowKeys(MONTHS_FOR_ACTIVITY);
  const totals = Object.fromEntries(keys.map((key) => [key, 0]));

  repos
    .filter((repo) => !repo?.fork)
    .forEach((repo) => {
      const monthKey = toMonthKey(repo?.created_at);
      if (!monthKey || !(monthKey in totals)) return;
      totals[monthKey] += 1;
    });

  return keys.map((monthKey) => ({
    key: monthKey,
    label: toMonthLabel(monthKey),
    value: totals[monthKey],
  }));
}

function buildMostActiveRepositories(commitRepos = [], fallbackEvents = []) {
  const fromGraphql = (Array.isArray(commitRepos) ? commitRepos : [])
    .map((entry) => {
      const count = Math.max(
        0,
        Math.floor(safeNumber(entry?.contributions?.totalCount, 0))
      );

      return {
        name: String(entry?.repository?.name || "").trim(),
        fullName: String(entry?.repository?.nameWithOwner || "").trim(),
        value: count,
        url: String(entry?.repository?.url || "").trim(),
      };
    })
    .filter((entry) => entry.name && entry.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  if (fromGraphql.length) {
    return fromGraphql;
  }

  const fromEvents = new Map();
  fallbackEvents.forEach((event) => {
    if (String(event?.type || "") !== "PushEvent") return;
    const repoName = String(event?.repo?.name || "").trim();
    if (!repoName) return;
    const commitCount = Math.max(1, Math.floor(safeNumber(event?.payload?.size, 1)));
    fromEvents.set(repoName, safeNumber(fromEvents.get(repoName), 0) + commitCount);
  });

  return [...fromEvents.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([fullName, value]) => ({
      name: fullName.split("/").pop() || fullName,
      fullName,
      value,
      url: `https://github.com/${fullName}`,
    }));
}

function buildProductiveTimeInsights(events = []) {
  const hourCounts = new Array(24).fill(0);

  (Array.isArray(events) ? events : []).forEach((event) => {
    const type = String(event?.type || "");
    if (!["PushEvent", "PullRequestEvent", "IssuesEvent"].includes(type)) return;

    const parsed = toDate(event?.created_at);
    if (!parsed) return;
    const hour = parsed.getUTCHours();
    hourCounts[hour] += 1;
  });

  const peakHour = hourCounts.reduce(
    (best, value, hour) => (value > best.value ? { hour, value } : best),
    { hour: 0, value: 0 }
  );

  const buckets = [
    { label: "Night", start: 0, end: 5, value: 0 },
    { label: "Morning", start: 6, end: 11, value: 0 },
    { label: "Afternoon", start: 12, end: 17, value: 0 },
    { label: "Evening", start: 18, end: 23, value: 0 },
  ];

  hourCounts.forEach((count, hour) => {
    const bucket = buckets.find((entry) => hour >= entry.start && hour <= entry.end);
    if (!bucket) return;
    bucket.value += count;
  });

  const dominantBucket = buckets.reduce(
    (best, bucket) => (bucket.value > best.value ? bucket : best),
    buckets[0]
  );

  return {
    peakHourUtc: peakHour.hour,
    peakHourEvents: peakHour.value,
    dominantBucket: dominantBucket.label,
    buckets: buckets.map((bucket) => ({
      label: bucket.label,
      value: bucket.value,
    })),
  };
}

function buildLanguageActivity(repos = [], events = [], languages = []) {
  const trackedLanguageNames = new Set(languages.map((entry) => entry.name));
  const monthKeys = monthWindowKeys(MONTHS_FOR_LANGUAGE_ACTIVITY);
  const monthSet = new Set(monthKeys);
  const monthlyMap = new Map(
    monthKeys.map((monthKey) => [
      monthKey,
      {
        key: monthKey,
        label: toMonthLabel(monthKey),
        values: Object.fromEntries([...trackedLanguageNames].map((name) => [name, 0])),
      },
    ])
  );

  const languageByRepo = new Map();
  repos.forEach((repo) => {
    const language = String(repo?.language || "").trim();
    const fullName = String(repo?.full_name || "").trim().toLowerCase();
    const shortName = String(repo?.name || "").trim().toLowerCase();
    if (!language) return;
    if (fullName) languageByRepo.set(fullName, language);
    if (shortName && !languageByRepo.has(shortName)) {
      languageByRepo.set(shortName, language);
    }
  });

  events.forEach((event) => {
    const monthKey = toMonthKey(event?.created_at);
    if (!monthSet.has(monthKey)) return;

    const repoFullName = String(event?.repo?.name || "").trim().toLowerCase();
    const repoName = repoFullName.split("/").pop() || "";
    const language =
      languageByRepo.get(repoFullName) || languageByRepo.get(repoName.toLowerCase()) || "";
    if (!trackedLanguageNames.has(language)) return;

    const monthEntry = monthlyMap.get(monthKey);
    if (!monthEntry) return;

    const weight =
      String(event?.type || "") === "PushEvent"
        ? Math.max(1, Math.floor(safeNumber(event?.payload?.size, 1)))
        : 1;

    monthEntry.values[language] = safeNumber(monthEntry.values[language], 0) + weight;
  });

  return monthKeys.map((monthKey) => monthlyMap.get(monthKey));
}

function average(values = []) {
  const safeValues = (Array.isArray(values) ? values : []).filter((value) =>
    Number.isFinite(Number(value))
  );
  if (!safeValues.length) return 0;
  return safeValues.reduce((sum, value) => sum + Number(value), 0) / safeValues.length;
}

function activityLevelFromCommits(totalCommits = 0, activeDayRatio = 0) {
  if (totalCommits >= 500 || activeDayRatio >= 0.6) return "high";
  if (totalCommits >= 180 || activeDayRatio >= 0.35) return "moderate";
  if (totalCommits >= 40 || activeDayRatio >= 0.12) return "low";
  return "inactive";
}

function consistencyLabel(score = 0) {
  const safeScore = Math.max(0, Math.floor(safeNumber(score, 0)));
  if (safeScore >= 70) return "consistent";
  if (safeScore >= 40) return "sporadic";
  return "inactive";
}

function trendDirectionFromMonthlySeries(monthlyTrend = []) {
  const series = Array.isArray(monthlyTrend) ? monthlyTrend : [];
  if (series.length < 4) {
    return {
      direction: "stable",
      deltaPercent: 0,
    };
  }

  const splitIndex = Math.floor(series.length / 2);
  const firstHalf = series.slice(0, splitIndex).map((entry) => safeNumber(entry?.value, 0));
  const secondHalf = series.slice(splitIndex).map((entry) => safeNumber(entry?.value, 0));
  const firstAvg = average(firstHalf);
  const secondAvg = average(secondHalf);
  const denominator = Math.max(1, firstAvg);
  const deltaPercent = ((secondAvg - firstAvg) / denominator) * 100;

  if (deltaPercent >= 10) {
    return { direction: "upward", deltaPercent: Math.round(deltaPercent) };
  }
  if (deltaPercent <= -10) {
    return { direction: "downward", deltaPercent: Math.round(deltaPercent) };
  }
  return { direction: "stable", deltaPercent: Math.round(deltaPercent) };
}

function scoreRepositoryHealth(repo = {}) {
  const now = Date.now();
  const pushedAt = toDate(repo?.pushed_at || repo?.updated_at || repo?.created_at);
  const lastPushDays = pushedAt
    ? Math.max(0, Math.floor((now - pushedAt.getTime()) / DAY_MS))
    : 9999;
  const openIssues = Math.max(0, Math.floor(safeNumber(repo?.open_issues_count, 0)));
  const hasDescription = Boolean(String(repo?.description || "").trim());
  const hasHomepage = Boolean(String(repo?.homepage || "").trim());
  const hasWiki = Boolean(repo?.has_wiki);
  const hasLicense = Boolean(repo?.license);
  const stars = Math.max(0, Math.floor(safeNumber(repo?.stargazers_count, 0)));
  const forks = Math.max(0, Math.floor(safeNumber(repo?.forks_count, 0)));

  const freshnessScore =
    lastPushDays <= 14
      ? 35
      : lastPushDays <= 45
        ? 28
        : lastPushDays <= 120
          ? 20
          : lastPushDays <= 240
            ? 12
            : 4;

  const maintenanceScore =
    lastPushDays <= 30
      ? 20
      : lastPushDays <= 90
        ? 14
        : lastPushDays <= 180
          ? 9
          : 3;

  const issueScore =
    openIssues === 0
      ? 15
      : openIssues <= 5
        ? 12
        : openIssues <= 15
          ? 8
          : openIssues <= 35
            ? 4
            : 1;

  const documentationSignals = [hasDescription, hasHomepage, hasWiki, hasLicense].filter(
    Boolean
  ).length;
  const documentationScore = Math.min(20, documentationSignals * 5);
  const communityScore = Math.min(10, Math.round(Math.log1p(stars + forks) * 2.5));

  let score = freshnessScore + maintenanceScore + issueScore + documentationScore + communityScore;
  if (repo?.archived || repo?.disabled) {
    score = Math.min(score, 25);
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  const health =
    score >= 80 ? "excellent" : score >= 65 ? "good" : score >= 45 ? "fair" : "at_risk";

  return {
    score,
    health,
    factors: {
      lastPushDays,
      openIssues,
      documentationSignals,
      hasLicense,
      archived: Boolean(repo?.archived),
      disabled: Boolean(repo?.disabled),
    },
  };
}

function buildRepositoryHealthInsights(repos = []) {
  const scored = repos.map((repo) => {
    const health = scoreRepositoryHealth(repo);
    return {
      name: String(repo?.name || ""),
      fullName: String(repo?.full_name || ""),
      private: Boolean(repo?.private),
      url: String(repo?.html_url || ""),
      stars: Math.max(0, Math.floor(safeNumber(repo?.stargazers_count, 0))),
      forks: Math.max(0, Math.floor(safeNumber(repo?.forks_count, 0))),
      openIssues: Math.max(0, Math.floor(safeNumber(repo?.open_issues_count, 0))),
      updatedAt: String(repo?.updated_at || ""),
      pushedAt: String(repo?.pushed_at || ""),
      language: String(repo?.language || ""),
      documentation: {
        hasDescription: Boolean(String(repo?.description || "").trim()),
        hasHomepage: Boolean(String(repo?.homepage || "").trim()),
        hasWiki: Boolean(repo?.has_wiki),
        hasLicense: Boolean(repo?.license),
      },
      maintenanceFrequency: health.factors.lastPushDays <= 30 ? "high" : health.factors.lastPushDays <= 120 ? "medium" : "low",
      issueResolutionIndicator:
        health.factors.openIssues === 0
          ? "healthy"
          : health.factors.openIssues <= 10
            ? "manageable"
            : health.factors.openIssues <= 30
              ? "watch"
              : "needs_attention",
      healthScore: health.score,
      healthStatus: health.health,
    };
  });

  const averageHealth = Math.round(average(scored.map((entry) => entry.healthScore)));
  const strongRepos = scored.filter((entry) => entry.healthScore >= 80).length;
  const atRiskRepos = scored.filter((entry) => entry.healthScore < 45).length;

  return {
    summary: {
      averageHealthScore: averageHealth,
      strongRepositories: strongRepos,
      atRiskRepositories: atRiskRepos,
    },
    repositories: scored.sort((a, b) => b.healthScore - a.healthScore),
  };
}

function inferTechnologyProfile(topLanguages = []) {
  const list = Array.isArray(topLanguages) ? topLanguages : [];
  const top = list.slice(0, 6);
  const langNames = new Set(top.map((entry) => String(entry?.name || "").toLowerCase()));

  const frontendSignals = ["javascript", "typescript", "html", "css", "vue", "svelte"];
  const backendSignals = ["python", "java", "go", "ruby", "php", "c#", "rust", "kotlin"];
  const dataSignals = ["python", "r", "jupyter notebook", "scala", "sql"];
  const systemsSignals = ["c", "c++", "rust", "go", "zig"];

  const signalCount = (signals) =>
    signals.reduce((count, signal) => (langNames.has(signal) ? count + 1 : count), 0);

  const frontendCount = signalCount(frontendSignals);
  const backendCount = signalCount(backendSignals);
  const dataCount = signalCount(dataSignals);
  const systemsCount = signalCount(systemsSignals);

  let role = "full_stack_developer";
  if (dataCount >= 2 && backendCount >= 1) {
    role = "data_engineer";
  } else if (systemsCount >= 2 && frontendCount === 0) {
    role = "systems_developer";
  } else if (frontendCount >= 2 && backendCount <= 1) {
    role = "frontend_developer";
  } else if (backendCount >= 2 && frontendCount <= 1) {
    role = "backend_developer";
  }

  const confidence = Math.max(
    35,
    Math.min(
      95,
      Math.round(
        45 +
          frontendCount * 8 +
          backendCount * 8 +
          dataCount * 6 +
          systemsCount * 6 +
          Math.max(0, safeNumber(top[0]?.percent, 0) / 4)
      )
    )
  );

  const specialization = role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    primaryLanguages: top.map((entry) => ({
      language: entry.name,
      percent: safeNumber(entry.percent, 0),
      weight: safeNumber(entry.value, 0),
    })),
    specializationRole: role,
    specializationLabel: specialization,
    confidence,
  };
}

function buildCodingPatternAnalysis({
  productiveTime = {},
  weeklyCommitActivity = [],
  monthlyContributionTrends = [],
  commitConsistencyScore = 0,
}) {
  const weekly = Array.isArray(weeklyCommitActivity) ? weeklyCommitActivity : [];
  const topDays = [...weekly]
    .sort((a, b) => safeNumber(b?.value, 0) - safeNumber(a?.value, 0))
    .slice(0, 3)
    .map((entry) => ({
      day: String(entry?.label || ""),
      commits: Math.max(0, Math.floor(safeNumber(entry?.value, 0))),
    }));

  const trend = trendDirectionFromMonthlySeries(monthlyContributionTrends);

  return {
    mostActiveHours: {
      dominantBucket: String(productiveTime?.dominantBucket || "unknown").toLowerCase(),
      peakHourUtc: Math.max(0, Math.floor(safeNumber(productiveTime?.peakHourUtc, 0))),
    },
    mostProductiveDays: topDays,
    codingConsistency: {
      score: Math.max(0, Math.floor(safeNumber(commitConsistencyScore, 0))),
      label: consistencyLabel(commitConsistencyScore),
    },
    contributionTrends: trend,
  };
}

function buildOpenSourceImpact({
  totalStars = 0,
  totalForks = 0,
  collaborationMetrics = {},
  externalContributionRepos = [],
}) {
  const pullRequests = Math.max(0, Math.floor(safeNumber(collaborationMetrics?.pullRequests, 0)));
  const reviews = Math.max(0, Math.floor(safeNumber(collaborationMetrics?.reviews, 0)));
  const externalRepoCount = Array.isArray(externalContributionRepos)
    ? externalContributionRepos.length
    : 0;

  const starsScore = Math.min(35, Math.round(Math.log1p(Math.max(0, totalStars)) * 6));
  const forksScore = Math.min(20, Math.round(Math.log1p(Math.max(0, totalForks)) * 6));
  const prScore = Math.min(20, Math.round(Math.log1p(pullRequests) * 7));
  const reviewScore = Math.min(10, Math.round(Math.log1p(reviews) * 5));
  const externalScore = Math.min(15, externalRepoCount * 2);
  const impactScore = Math.max(
    0,
    Math.min(100, starsScore + forksScore + prScore + reviewScore + externalScore)
  );

  const impactLevel =
    impactScore >= 75
      ? "high"
      : impactScore >= 50
        ? "moderate"
        : impactScore >= 30
          ? "growing"
          : "limited";

  return {
    score: impactScore,
    level: impactLevel,
    metrics: {
      stars: Math.max(0, Math.floor(safeNumber(totalStars, 0))),
      forks: Math.max(0, Math.floor(safeNumber(totalForks, 0))),
      pullRequests,
      reviews,
      externalRepositoryContributions: externalRepoCount,
    },
  };
}

function buildCollaborationBehavior({
  collaborationMetrics = {},
  externalContributionRepos = [],
  monthsForWindow = MONTHS_FOR_ACTIVITY,
}) {
  const pullRequests = Math.max(0, Math.floor(safeNumber(collaborationMetrics?.pullRequests, 0)));
  const issues = Math.max(0, Math.floor(safeNumber(collaborationMetrics?.issues, 0)));
  const reviews = Math.max(0, Math.floor(safeNumber(collaborationMetrics?.reviews, 0)));
  const total = pullRequests + issues + reviews;
  const monthlyRate = Number((total / Math.max(1, monthsForWindow)).toFixed(1));
  const externalRepos = Array.isArray(externalContributionRepos)
    ? externalContributionRepos.length
    : 0;

  const level =
    monthlyRate >= 8
      ? "highly_collaborative"
      : monthlyRate >= 3
        ? "moderately_collaborative"
        : monthlyRate > 0
          ? "limited_collaboration"
          : "solo_focused";

  return {
    level,
    metrics: {
      pullRequests,
      issues,
      reviews,
      totalInteractions: total,
      monthlyInteractionRate: monthlyRate,
      externalRepositoriesCollaborated: externalRepos,
    },
  };
}

function buildSecurityAndQualityIndicators({
  repos = [],
  commitConsistencyScore = 0,
  repositoryHealth = {},
}) {
  const now = Date.now();
  const nonForkRepos = (Array.isArray(repos) ? repos : []).filter((repo) => !repo?.fork);
  const inactiveRepos = nonForkRepos.filter((repo) => {
    const updated = toDate(repo?.pushed_at || repo?.updated_at || repo?.created_at);
    if (!updated) return true;
    const ageDays = Math.floor((now - updated.getTime()) / DAY_MS);
    return ageDays > 180;
  });
  const abandonedRepos = nonForkRepos.filter((repo) => {
    const updated = toDate(repo?.pushed_at || repo?.updated_at || repo?.created_at);
    if (!updated) return true;
    const ageDays = Math.floor((now - updated.getTime()) / DAY_MS);
    return ageDays > 365 && safeNumber(repo?.open_issues_count, 0) > 0;
  });
  const unlicensedRepos = nonForkRepos.filter((repo) => !repo?.license);
  const highIssueRepos = nonForkRepos.filter(
    (repo) => safeNumber(repo?.open_issues_count, 0) >= 20
  );

  const risks = [];
  if (inactiveRepos.length) {
    risks.push({
      type: "inactive_repositories",
      severity: inactiveRepos.length >= 5 ? "high" : "medium",
      count: inactiveRepos.length,
      note: "Several repositories have not been updated in over 180 days.",
    });
  }
  if (abandonedRepos.length) {
    risks.push({
      type: "abandoned_projects",
      severity: abandonedRepos.length >= 3 ? "high" : "medium",
      count: abandonedRepos.length,
      note: "Projects appear abandoned with stale activity and open issues.",
    });
  }
  if (consistencyLabel(commitConsistencyScore) !== "consistent") {
    risks.push({
      type: "inconsistent_commits",
      severity: commitConsistencyScore < 40 ? "high" : "medium",
      count: 1,
      note: "Commit pattern is inconsistent, reducing delivery predictability.",
    });
  }
  if (highIssueRepos.length) {
    risks.push({
      type: "issue_backlog",
      severity: "medium",
      count: highIssueRepos.length,
      note: "Some repositories show high open-issue backlog.",
    });
  }
  if (unlicensedRepos.length) {
    risks.push({
      type: "missing_license",
      severity: "low",
      count: unlicensedRepos.length,
      note: "Multiple repositories do not define an explicit license.",
    });
  }

  return {
    indicators: {
      inactiveRepositories: inactiveRepos.length,
      abandonedProjects: abandonedRepos.length,
      highIssueBacklogRepositories: highIssueRepos.length,
      unlicensedRepositories: unlicensedRepos.length,
      commitConsistencyScore: Math.max(0, Math.floor(safeNumber(commitConsistencyScore, 0))),
      outdatedDependencies: {
        status: "unknown",
        reason: "Dependency manifests were not scanned in this analytics pass.",
      },
      averageRepositoryHealthScore: Math.max(
        0,
        Math.floor(safeNumber(repositoryHealth?.summary?.averageHealthScore, 0))
      ),
    },
    risks,
  };
}

function buildImprovementSuggestions({
  productivity = {},
  repositoryHealth = {},
  openSourceImpact = {},
  collaborationBehavior = {},
  securityQuality = {},
}) {
  const suggestions = [];
  const consistency = String(productivity?.consistencyLabel || "");
  const repoAvg = safeNumber(repositoryHealth?.summary?.averageHealthScore, 0);
  const atRiskRepos = safeNumber(repositoryHealth?.summary?.atRiskRepositories, 0);
  const impactScore = safeNumber(openSourceImpact?.score, 0);
  const collaborationLevel = String(collaborationBehavior?.level || "");
  const inactiveRepos = safeNumber(securityQuality?.indicators?.inactiveRepositories, 0);

  if (consistency !== "consistent") {
    suggestions.push({
      priority: "high",
      title: "Improve commit consistency",
      action:
        "Adopt smaller, daily commits and maintain a weekly delivery cadence to improve streak and predictability.",
    });
  }

  if (repoAvg < 65 || atRiskRepos > 0) {
    suggestions.push({
      priority: "high",
      title: "Raise repository health",
      action:
        "Prioritize repositories with low health scores: close stale issues, refresh README docs, and push maintenance updates.",
    });
  }

  if (impactScore < 50) {
    suggestions.push({
      priority: "medium",
      title: "Increase open source impact",
      action:
        "Contribute pull requests to external repositories and improve project discoverability with clearer docs and release notes.",
    });
  }

  if (
    collaborationLevel === "limited_collaboration" ||
    collaborationLevel === "solo_focused"
  ) {
    suggestions.push({
      priority: "medium",
      title: "Collaborate more publicly",
      action:
        "Participate in issue discussions, code reviews, and PR feedback loops to increase collaboration visibility.",
    });
  }

  if (inactiveRepos > 0) {
    suggestions.push({
      priority: "low",
      title: "Archive or revive inactive projects",
      action:
        "Archive truly abandoned repositories and revive strategic ones with roadmap updates and dependency maintenance.",
    });
  }

  if (!suggestions.length) {
    suggestions.push({
      priority: "low",
      title: "Maintain momentum",
      action:
        "Keep current delivery cadence and periodically refresh documentation, issue triage, and roadmap visibility.",
    });
  }

  return suggestions;
}

function computeDeveloperPerformanceScore({
  activityLevel = "inactive",
  commitConsistencyScore = 0,
  collaborationBehavior = {},
  repositoryHealth = {},
  openSourceImpact = {},
}) {
  const activityScore =
    activityLevel === "high" ? 90 : activityLevel === "moderate" ? 72 : activityLevel === "low" ? 48 : 20;
  const consistency = Math.max(0, Math.min(100, Math.floor(safeNumber(commitConsistencyScore, 0))));
  const collaborationRate = safeNumber(
    collaborationBehavior?.metrics?.monthlyInteractionRate,
    0
  );
  const collaborationScore = Math.max(15, Math.min(100, Math.round(collaborationRate * 10)));
  const projectQualityScore = Math.max(
    0,
    Math.min(100, Math.floor(safeNumber(repositoryHealth?.summary?.averageHealthScore, 0)))
  );
  const impactScore = Math.max(
    0,
    Math.min(100, Math.floor(safeNumber(openSourceImpact?.score, 0)))
  );

  const composite = Math.round(
    activityScore * 0.25 +
      consistency * 0.25 +
      collaborationScore * 0.2 +
      projectQualityScore * 0.2 +
      impactScore * 0.1
  );

  const band =
    composite >= 80
      ? "elite"
      : composite >= 65
        ? "strong"
        : composite >= 50
          ? "developing"
          : "early_stage";

  return {
    score: composite,
    band,
    components: {
      activity: activityScore,
      consistency,
      collaboration: collaborationScore,
      projectQuality: projectQualityScore,
      openSourceImpact: impactScore,
    },
  };
}

function buildDeveloperAnalysis({
  username = "",
  totalCommits = 0,
  contributionDays = [],
  streaks = {},
  weeklyCommitActivity = [],
  monthlyContributionTrends = [],
  repositoryHealth = {},
  languageDistribution = [],
  productiveTime = {},
  collaborationMetrics = {},
  totalStars = 0,
  totalForks = 0,
  repos = [],
  events = [],
  commitConsistencyScore = 0,
}) {
  const activeDays = (Array.isArray(contributionDays) ? contributionDays : []).filter(
    (entry) => safeNumber(entry?.count, 0) > 0
  ).length;
  const activeDayRatio =
    activeDays / Math.max(1, Array.isArray(contributionDays) ? contributionDays.length : 1);
  const avgCommitsPerWeek = Number((safeNumber(totalCommits, 0) / 52).toFixed(2));
  const activityLevel = activityLevelFromCommits(totalCommits, activeDayRatio);
  const productivityLabel = consistencyLabel(commitConsistencyScore);

  const externalContributionRepos = [
    ...new Set(
      (Array.isArray(events) ? events : [])
        .map((event) => String(event?.repo?.name || "").trim().toLowerCase())
        .filter((repoName) => repoName && !repoName.startsWith(`${username}/`))
    ),
  ];

  const codingPatterns = buildCodingPatternAnalysis({
    productiveTime,
    weeklyCommitActivity,
    monthlyContributionTrends,
    commitConsistencyScore,
  });
  const technologyProfile = inferTechnologyProfile(languageDistribution);
  const openSourceImpact = buildOpenSourceImpact({
    totalStars,
    totalForks,
    collaborationMetrics,
    externalContributionRepos,
  });
  const collaborationBehavior = buildCollaborationBehavior({
    collaborationMetrics,
    externalContributionRepos,
  });
  const securityQuality = buildSecurityAndQualityIndicators({
    repos,
    commitConsistencyScore,
    repositoryHealth,
  });

  const productivityMetrics = {
    totalCommits: Math.max(0, Math.floor(safeNumber(totalCommits, 0))),
    averageCommitsPerWeek: avgCommitsPerWeek,
    activeDays,
    activeDayRatio: Number(activeDayRatio.toFixed(3)),
    contributionStreak: Math.max(0, Math.floor(safeNumber(streaks?.current, 0))),
    longestStreak: Math.max(0, Math.floor(safeNumber(streaks?.longest, 0))),
    consistencyScore: Math.max(0, Math.floor(safeNumber(commitConsistencyScore, 0))),
    consistencyLabel: productivityLabel,
  };

  const developerScore = computeDeveloperPerformanceScore({
    activityLevel,
    commitConsistencyScore,
    collaborationBehavior,
    repositoryHealth,
    openSourceImpact,
  });

  const summaryText =
    activityLevel === "high"
      ? "High activity developer with strong engagement and frequent contributions."
      : activityLevel === "moderate"
        ? "Moderately active developer with steady GitHub engagement."
        : activityLevel === "low"
          ? "Low activity developer with intermittent contribution patterns."
          : "Currently inactive developer with limited recent GitHub activity.";

  const suggestions = buildImprovementSuggestions({
    productivity: productivityMetrics,
    repositoryHealth,
    openSourceImpact,
    collaborationBehavior,
    securityQuality,
  });

  return {
    developerActivitySummary: {
      activityLevel,
      engagement: summaryText,
      highlights: {
        activeDays,
        averageCommitsPerWeek: avgCommitsPerWeek,
        collaborationInteractions: Math.max(
          0,
          Math.floor(safeNumber(collaborationBehavior?.metrics?.totalInteractions, 0))
        ),
      },
    },
    productivityMetrics,
    repositoryHealthInsights: repositoryHealth,
    codingPatternAnalysis: codingPatterns,
    technologyProfile,
    openSourceImpact: {
      openSourceImpactScore: openSourceImpact.score,
      impactLevel: openSourceImpact.level,
      ...openSourceImpact.metrics,
    },
    collaborationBehavior,
    securityAndCodeQualityIndicators: securityQuality,
    improvementSuggestions: suggestions,
    developerScore: {
      developerPerformanceScore: developerScore.score,
      performanceBand: developerScore.band,
      componentScores: developerScore.components,
    },
  };
}

async function fetchGithubJson(url, token) {
  const response = await fetch(url, {
    headers: toHeaders(token),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);

  return {
    ok: response.ok,
    status: response.status,
    data: payload,
  };
}

async function fetchGraphql({ token, query, variables }) {
  const response = await fetch(GITHUB_GRAPHQL_URL, {
    method: "POST",
    headers: {
      ...toHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  const hasErrors = Array.isArray(payload?.errors) && payload.errors.length > 0;

  return {
    ok: response.ok && !hasErrors,
    status: response.status,
    data: payload?.data || null,
    errors: payload?.errors || null,
    message: payload?.message || "",
  };
}

async function fetchOwnedRepos(token) {
  let page = 1;
  const repos = [];

  while (page <= MAX_REPO_PAGES) {
    const url = `${GITHUB_REST_URL}/user/repos?per_page=${REPOS_PER_PAGE}&page=${page}&sort=updated&direction=desc&type=owner`;
    const response = await fetchGithubJson(url, token);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: repos,
      };
    }

    const pageRepos = Array.isArray(response.data) ? response.data : [];
    repos.push(...pageRepos);

    if (pageRepos.length < REPOS_PER_PAGE) {
      break;
    }

    page += 1;
  }

  const deduped = [];
  const seen = new Set();

  repos.forEach((repo) => {
    const key = String(repo?.id || "").trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    deduped.push(repo);
  });

  return {
    ok: true,
    status: 200,
    data: deduped,
  };
}

async function fetchRecentEvents({ username, token }) {
  const urls = [
    `${GITHUB_REST_URL}/users/${username}/events?per_page=${EVENTS_PER_PAGE}`,
    `${GITHUB_REST_URL}/users/${username}/events/public?per_page=${EVENTS_PER_PAGE}`,
  ];

  const results = await Promise.all(urls.map((url) => fetchGithubJson(url, token)));
  const merged = results
    .filter((result) => result.ok && Array.isArray(result?.data))
    .flatMap((result) => result.data);

  return dedupeById(merged);
}

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const accessToken = String(session?.accessToken || "").trim();
    if (!accessToken) {
      return jsonError(401, "Missing GitHub access token. Please sign in again.");
    }

    const body = await req.json().catch(() => ({}));
    const sessionUsername = normalizeUsername(
      session?.username || session?.user?.name || ""
    );
    const requestedUsername = normalizeUsername(body?.username || sessionUsername);

    if (!sessionUsername) {
      return jsonError(403, "Unable to resolve authenticated GitHub username");
    }

    if (!requestedUsername) {
      return jsonError(400, "username is required");
    }

    if (requestedUsername !== sessionUsername) {
      return jsonError(403, "You can only read analytics data for your own account");
    }

    const [profileResponse, reposResponse, events] = await Promise.all([
      fetchGithubJson(`${GITHUB_REST_URL}/user`, accessToken),
      fetchOwnedRepos(accessToken),
      fetchRecentEvents({ username: requestedUsername, token: accessToken }),
    ]);

    if (!profileResponse.ok || !profileResponse?.data?.login) {
      return jsonError(
        profileResponse.status || 502,
        profileResponse?.data?.message || "Failed to load GitHub profile"
      );
    }

    const profile = profileResponse.data;
    const repos = reposResponse.ok ? reposResponse.data : [];

    const now = new Date();
    const from = new Date(now.getTime() - 365 * DAY_MS);

    const contributionsResponse = await fetchGraphql({
      token: accessToken,
      query: YEARLY_CONTRIBUTIONS_QUERY,
      variables: {
        login: requestedUsername,
        from: from.toISOString(),
        to: now.toISOString(),
      },
    });

    const contributionsCollection =
      contributionsResponse?.data?.user?.contributionsCollection || null;
    const calendar = contributionsCollection?.contributionCalendar || null;
    const contributionDays = flattenContributionDays(calendar?.weeks || []);
    const streaks = computeStreaks(contributionDays);

    const nonForkRepos = repos.filter((repo) => !repo?.fork);
    const totalStars = nonForkRepos.reduce(
      (sum, repo) => sum + Math.max(0, Math.floor(safeNumber(repo?.stargazers_count, 0))),
      0
    );
    const totalForks = nonForkRepos.reduce(
      (sum, repo) => sum + Math.max(0, Math.floor(safeNumber(repo?.forks_count, 0))),
      0
    );

    const accountCreated = toDate(profile?.created_at);
    const accountAgeDays = accountCreated
      ? Math.max(0, Math.floor((Date.now() - accountCreated.getTime()) / DAY_MS))
      : 0;

    const languageDistribution = buildLanguageDistribution(repos);
    const languageActivity = buildLanguageActivity(repos, events, languageDistribution);
    const weeklyCommitActivity = buildWeeklyActivity(contributionDays);
    const monthlyContributionTrends = buildMonthlyContributionTrend(contributionDays);
    const mostActiveRepositories = buildMostActiveRepositories(
      contributionsCollection?.commitContributionsByRepository || [],
      events
    );
    const commitConsistencyScore = computeConsistencyScore(contributionDays);
    const productiveTime = buildProductiveTimeInsights(events);
    const repositoryCreationTrends = buildRepositoryCreationTrend(repos);

    const collaborationMetrics = {
      pullRequests: Math.max(
        0,
        Math.floor(safeNumber(contributionsCollection?.totalPullRequestContributions, 0))
      ),
      issues: Math.max(
        0,
        Math.floor(safeNumber(contributionsCollection?.totalIssueContributions, 0))
      ),
      reviews: Math.max(
        0,
        Math.floor(safeNumber(contributionsCollection?.totalPullRequestReviewContributions, 0))
      ),
    };
    collaborationMetrics.total =
      collaborationMetrics.pullRequests +
      collaborationMetrics.issues +
      collaborationMetrics.reviews;

    const repositoryHealthInsights = buildRepositoryHealthInsights(nonForkRepos);
    const developerAnalysis = buildDeveloperAnalysis({
      username: requestedUsername,
      totalCommits: Math.max(
        0,
        Math.floor(safeNumber(contributionsCollection?.totalCommitContributions, 0))
      ),
      contributionDays,
      streaks,
      weeklyCommitActivity,
      monthlyContributionTrends,
      repositoryHealth: repositoryHealthInsights,
      languageDistribution,
      productiveTime,
      collaborationMetrics,
      totalStars,
      totalForks,
      repos: nonForkRepos,
      events,
      commitConsistencyScore,
    });

    return NextResponse.json(
      {
        ok: true,
        username: requestedUsername,
        generatedAt: new Date().toISOString(),
        profile: {
          login: String(profile?.login || requestedUsername),
          name: String(profile?.name || ""),
          avatarUrl: String(profile?.avatar_url || ""),
          bio: String(profile?.bio || ""),
          htmlUrl: String(profile?.html_url || ""),
        },
        overview: {
          totalRepositories: Math.max(
            0,
            Math.floor(safeNumber(profile?.public_repos, repos.length))
          ),
          totalStars,
          totalForks,
          followers: Math.max(0, Math.floor(safeNumber(profile?.followers, 0))),
          following: Math.max(0, Math.floor(safeNumber(profile?.following, 0))),
          accountCreatedAt: accountCreated ? accountCreated.toISOString() : "",
          accountAgeDays,
          totalCommits: Math.max(
            0,
            Math.floor(safeNumber(contributionsCollection?.totalCommitContributions, 0))
          ),
          contributionStreak: streaks.current,
          longestStreak: streaks.longest,
          totalContributions: Math.max(
            0,
            Math.floor(safeNumber(calendar?.totalContributions, 0))
          ),
          contributionWindow: "last_12_months",
        },
        languageInsights: {
          topLanguages: languageDistribution,
          activity: languageActivity,
        },
        activityInsights: {
          weeklyCommitActivity,
          monthlyContributionTrends,
          mostActiveRepositories,
          commitConsistencyScore,
        },
        developerInsights: {
          productiveTime,
          repositoryCreationTrends,
          collaborationMetrics,
        },
        structuredAnalysis: {
          developer_activity_summary: developerAnalysis.developerActivitySummary,
          productivity_metrics: developerAnalysis.productivityMetrics,
          repository_health_insights: developerAnalysis.repositoryHealthInsights,
          coding_pattern_analysis: developerAnalysis.codingPatternAnalysis,
          technology_profile: developerAnalysis.technologyProfile,
          open_source_impact: developerAnalysis.openSourceImpact,
          collaboration_behavior: developerAnalysis.collaborationBehavior,
          security_code_quality_indicators:
            developerAnalysis.securityAndCodeQualityIndicators,
          improvement_suggestions: developerAnalysis.improvementSuggestions,
          developer_score: developerAnalysis.developerScore,
        },
        contributionHeatmap: {
          days: contributionDays,
          totalContributions: Math.max(
            0,
            Math.floor(safeNumber(calendar?.totalContributions, 0))
          ),
        },
        dataWarnings: {
          repositoriesPartial: !reposResponse.ok,
          contributionsUnavailable: !contributionsResponse.ok,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(500, error?.message || "Failed to build dashboard analytics");
  }
}
