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
