const DAY_MS = 24 * 60 * 60 * 1000;
const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const CONTRIBUTION_CALENDAR_QUERY = `
  query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;
const COMMIT_CONTRIBUTION_STATS_QUERY = `
  query CommitContributionStats(
    $login: String!
    $from: DateTime!
    $to: DateTime!
    $repoLimit: Int!
    $dayLimit: Int!
  ) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        commitContributionsByRepository(maxRepositories: $repoLimit) {
          repository {
            nameWithOwner
          }
          contributions(first: $dayLimit) {
            nodes {
              occurredAt
              commitCount
            }
          }
        }
      }
    }
  }
`;

function normalizeGithubUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toIsoDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
}

function isoDayToEpoch(day) {
  const stamp = Date.parse(`${day}T00:00:00.000Z`);
  if (!Number.isFinite(stamp)) return 0;
  return stamp;
}

function dayGap(fromDay, toDay) {
  const fromEpoch = isoDayToEpoch(fromDay);
  const toEpoch = isoDayToEpoch(toDay);
  if (!fromEpoch || !toEpoch) return Number.POSITIVE_INFINITY;
  return Math.round((toEpoch - fromEpoch) / DAY_MS);
}

function sumCommitsWithinWindow(dayCounts, windowDays) {
  const cutoffEpoch = Date.now() - (windowDays - 1) * DAY_MS;
  return Object.entries(dayCounts || {}).reduce((sum, [day, count]) => {
    if (isoDayToEpoch(day) < cutoffEpoch) return sum;
    return sum + Number(count || 0);
  }, 0);
}

function countActiveDays(dayCounts, windowDays) {
  const cutoffEpoch = Date.now() - (windowDays - 1) * DAY_MS;
  return Object.entries(dayCounts || {}).reduce((count, [day, commits]) => {
    if (isoDayToEpoch(day) < cutoffEpoch) return count;
    if (Number(commits || 0) <= 0) return count;
    return count + 1;
  }, 0);
}

function computeStreak(dayCounts) {
  const activeDays = Object.entries(dayCounts || {})
    .filter(([, count]) => Number(count || 0) > 0)
    .map(([day]) => day)
    .sort();

  if (!activeDays.length) {
    return { current: 0, longest: 0 };
  }

  let longest = 1;
  let running = 1;

  for (let index = 1; index < activeDays.length; index += 1) {
    const gap = dayGap(activeDays[index - 1], activeDays[index]);
    if (gap === 1) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 1;
    }
  }

  const today = toIsoDate(new Date());
  let current = 0;
  let previous = "";

  for (let index = activeDays.length - 1; index >= 0; index -= 1) {
    const day = activeDays[index];

    if (!previous) {
      const recentGap = dayGap(day, today);
      if (recentGap > 1) {
        current = 0;
        break;
      }

      current = 1;
      previous = day;
      continue;
    }

    const gap = dayGap(day, previous);
    if (gap === 1) {
      current += 1;
      previous = day;
      continue;
    }

    break;
  }

  return { current, longest };
}

function getTopRepoRecent(repoDayCounts, windowDays = 30) {
  const cutoffEpoch = Date.now() - (windowDays - 1) * DAY_MS;
  let topRepo = "";
  let topCommits = 0;

  Object.entries(repoDayCounts || {}).forEach(([repo, dayCounts]) => {
    const repoCommits = Object.entries(dayCounts || {}).reduce((sum, [day, count]) => {
      if (isoDayToEpoch(day) < cutoffEpoch) return sum;
      return sum + Number(count || 0);
    }, 0);

    if (repoCommits > topCommits) {
      topRepo = repo;
      topCommits = repoCommits;
      return;
    }

    if (repoCommits === topCommits && repoCommits > 0 && repo < topRepo) {
      topRepo = repo;
    }
  });

  return {
    repo: topRepo,
    commits: topCommits,
  };
}

function getMostRecentRepo(repoDayCounts) {
  let recentRepo = "";
  let recentDayEpoch = 0;
  let recentDayCommits = 0;

  Object.entries(repoDayCounts || {}).forEach(([repo, dayCounts]) => {
    Object.entries(dayCounts || {}).forEach(([day, count]) => {
      const commits = Number(count || 0);
      if (commits <= 0) return;

      const dayEpoch = isoDayToEpoch(day);
      if (dayEpoch > recentDayEpoch) {
        recentDayEpoch = dayEpoch;
        recentRepo = repo;
        recentDayCommits = commits;
        return;
      }

      if (dayEpoch === recentDayEpoch && commits > recentDayCommits) {
        recentRepo = repo;
        recentDayCommits = commits;
        return;
      }

      if (dayEpoch === recentDayEpoch && commits === recentDayCommits && repo < recentRepo) {
        recentRepo = repo;
      }
    });
  });

  return recentRepo;
}

export function buildGithubRestHeaders(token = "", extraHeaders = {}) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": "GitHance",
    ...extraHeaders,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function fetchGithubJson(url, token = "") {
  const response = await fetch(url, {
    headers: buildGithubRestHeaders(token),
    cache: "no-store",
  });

  const body = await response.text();
  let data = null;

  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}

export async function resolveGithubUsername({ username = "", token = "" }) {
  const cleanedUsername = normalizeGithubUsername(username);
  if (cleanedUsername) return cleanedUsername;
  if (!token) return "";

  const me = await fetchGithubJson(`${GITHUB_API}/user`, token);
  if (!me.ok) return "";

  return normalizeGithubUsername(me.data?.login);
}

function dedupeEvents(events = []) {
  const seen = new Set();
  const list = [];

  events.forEach((event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId || seen.has(eventId)) return;
    seen.add(eventId);
    list.push(event);
  });

  return list.sort((left, right) => {
    const leftEpoch = Date.parse(left?.created_at || "") || 0;
    const rightEpoch = Date.parse(right?.created_at || "") || 0;
    return rightEpoch - leftEpoch;
  });
}

async function fetchGithubEventPages(baseUrl, token = "", maxPages = 3, perPage = 100) {
  const events = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const separator = baseUrl.includes("?") ? "&" : "?";
    const result = await fetchGithubJson(
      `${baseUrl}${separator}per_page=${perPage}&page=${page}`,
      token
    );

    if (!result.ok || !Array.isArray(result.data) || !result.data.length) {
      break;
    }

    events.push(...result.data);

    if (result.data.length < perPage) {
      break;
    }
  }

  return events;
}

export async function fetchGithubRecentEvents({
  username,
  token = "",
  maxPages = 3,
  perPage = 100,
}) {
  const normalizedUsername = normalizeGithubUsername(username);
  if (!normalizedUsername) return [];

  const urls = token
    ? [
        `${GITHUB_API}/users/${normalizedUsername}/events`,
        `${GITHUB_API}/users/${normalizedUsername}/events/public`,
      ]
    : [`${GITHUB_API}/users/${normalizedUsername}/events/public`];

  const nestedResults = await Promise.all(
    urls.map((url) => fetchGithubEventPages(url, token, maxPages, perPage))
  );

  return dedupeEvents(nestedResults.flat());
}

function parseContributionDaysFromSvg(svgMarkup = "") {
  const rectMatches = svgMarkup.match(/<rect\b[^>]*>/g) || [];
  const days = [];

  rectMatches.forEach((tagMarkup) => {
    const dateMatch = /data-date="([^"]+)"/i.exec(tagMarkup);
    const countMatch = /data-count="([^"]+)"/i.exec(tagMarkup);
    const date = toIsoDate(dateMatch?.[1]);
    const count = Math.max(0, Math.floor(Number(countMatch?.[1] || 0)));

    if (!date) return;
    days.push({ date, count });
  });

  return days;
}

function decodeHtmlText(value = "") {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseContributionCountFromTooltip(tooltipMarkup = "") {
  const tooltipText = decodeHtmlText(tooltipMarkup);
  if (!tooltipText) return null;
  if (/^No contributions on\b/i.test(tooltipText)) {
    return 0;
  }

  const countMatch = /([\d,]+)\s+contributions?\s+on\b/i.exec(tooltipText);
  if (!countMatch) return null;

  const count = Number.parseInt(
    String(countMatch[1] || "").replace(/,/g, ""),
    10
  );
  if (!Number.isFinite(count) || count < 0) return null;
  return count;
}

function parseContributionDaysFromHtml(htmlMarkup = "") {
  const tooltipCountByTargetId = new Map();
  const tooltipMatches = htmlMarkup.matchAll(
    /<tool-tip\b[^>]*\bfor="([^"]+)"[^>]*>([\s\S]*?)<\/tool-tip>/gi
  );

  for (const match of tooltipMatches) {
    const targetId = String(match?.[1] || "").trim();
    if (!targetId) continue;

    const count = parseContributionCountFromTooltip(match?.[2]);
    if (Number.isFinite(count)) {
      tooltipCountByTargetId.set(targetId, count);
    }
  }

  const dayCellMatches = htmlMarkup.matchAll(
    /<td\b[^>]*\bclass="[^"]*\bContributionCalendar-day\b[^"]*"[^>]*>/gi
  );
  const days = [];

  for (const match of dayCellMatches) {
    const tagMarkup = String(match?.[0] || "");
    const dateMatch = /\bdata-date="([^"]+)"/i.exec(tagMarkup);
    const idMatch = /\bid="([^"]+)"/i.exec(tagMarkup);
    const countMatch = /\bdata-count="([^"]+)"/i.exec(tagMarkup);
    const date = toIsoDate(dateMatch?.[1]);
    if (!date) continue;

    let count = Number.parseInt(
      String(countMatch?.[1] || "").replace(/,/g, ""),
      10
    );

    if (!Number.isFinite(count)) {
      const targetId = String(idMatch?.[1] || "").trim();
      count = tooltipCountByTargetId.get(targetId);
    }

    if (!Number.isFinite(count) && /\bdata-level="0"/i.test(tagMarkup)) {
      count = 0;
    }

    if (!Number.isFinite(count) || count < 0) continue;
    days.push({ date, count: Math.floor(count) });
  }

  return days;
}

function parseContributionDaysFromMarkup(markup = "") {
  const svgDays = parseContributionDaysFromSvg(markup);
  if (svgDays.length) {
    return svgDays;
  }

  return parseContributionDaysFromHtml(markup);
}

async function fetchPublicContributionCalendar({ username, from, to }) {
  const normalizedUsername = normalizeGithubUsername(username);
  if (!normalizedUsername) {
    return {
      ok: false,
      status: 400,
      error: "GitHub username is required",
    };
  }

  const fromDate = toIsoDate(from);
  const toDate = toIsoDate(to);
  const url = `https://github.com/users/${encodeURIComponent(
    normalizedUsername
  )}/contributions?from=${fromDate}&to=${toDate}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/svg+xml,text/html;q=0.9,*/*;q=0.8",
        "User-Agent": "GitHance",
      },
      cache: "no-store",
    });

    const body = await response.text();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: "Failed to fetch public contribution calendar",
      };
    }

    const days = parseContributionDaysFromMarkup(body);
    const totalContributions = days.reduce(
      (sum, entry) => sum + Number(entry?.count || 0),
      0
    );

    return {
      ok: true,
      status: response.status,
      data: {
        username: normalizedUsername,
        totalContributions,
        days,
        fetchedAt: new Date().toISOString(),
        source: "public_markup",
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Failed to fetch public contribution calendar",
    };
  }
}

async function fetchTokenContributionCalendar({ username, token, from, to }) {
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing GitHub token",
    };
  }

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: buildGithubRestHeaders(token, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        query: CONTRIBUTION_CALENDAR_QUERY,
        variables: {
          login: username,
          from: from.toISOString(),
          to: to.toISOString(),
        },
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.errors?.length) {
      const message =
        payload?.errors?.[0]?.message ||
        payload?.message ||
        "Failed to fetch contribution graph data";
      return {
        ok: false,
        status: response.status || 502,
        error: message,
      };
    }

    const calendar =
      payload?.data?.user?.contributionsCollection?.contributionCalendar || null;
    const weeks = Array.isArray(calendar?.weeks) ? calendar.weeks : [];

    const days = weeks
      .flatMap((week) =>
        Array.isArray(week?.contributionDays) ? week.contributionDays : []
      )
      .map((entry) => ({
        date: toIsoDate(entry?.date),
        count: Math.max(0, Math.floor(Number(entry?.contributionCount || 0))),
      }))
      .filter((entry) => entry.date);

    return {
      ok: true,
      status: response.status,
      data: {
        username,
        totalContributions: Number(calendar?.totalContributions || 0),
        days,
        fetchedAt: new Date().toISOString(),
        source: "graphql",
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Failed to fetch contribution graph data",
    };
  }
}

async function fetchTokenCommitContributionStats({ username, token, from, to }) {
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: "Missing GitHub token",
    };
  }

  try {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: buildGithubRestHeaders(token, {
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        query: COMMIT_CONTRIBUTION_STATS_QUERY,
        variables: {
          login: username,
          from: from.toISOString(),
          to: to.toISOString(),
          repoLimit: 100,
          dayLimit: 400,
        },
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.errors?.length) {
      const message =
        payload?.errors?.[0]?.message ||
        payload?.message ||
        "Failed to fetch commit contribution stats";
      return {
        ok: false,
        status: response.status || 502,
        error: message,
      };
    }

    const collection = payload?.data?.user?.contributionsCollection || null;
    const repositories = Array.isArray(collection?.commitContributionsByRepository)
      ? collection.commitContributionsByRepository
      : [];
    const dayCounts = {};
    const repoDayCounts = {};

    repositories.forEach((entry) => {
      const repoName = String(entry?.repository?.nameWithOwner || "")
        .trim()
        .toLowerCase();
      if (!repoName) return;

      const nodes = Array.isArray(entry?.contributions?.nodes)
        ? entry.contributions.nodes
        : [];

      nodes.forEach((node) => {
        const day = toIsoDate(node?.occurredAt);
        const commitCount = Math.max(0, Math.floor(Number(node?.commitCount || 0)));
        if (!day || commitCount <= 0) return;

        dayCounts[day] = Number(dayCounts[day] || 0) + commitCount;
        if (!repoDayCounts[repoName]) {
          repoDayCounts[repoName] = {};
        }
        repoDayCounts[repoName][day] = Number(repoDayCounts[repoName][day] || 0) + commitCount;
      });
    });

    const streak = computeStreak(dayCounts);
    const topRepo = getTopRepoRecent(repoDayCounts, 30);
    const lastRepo = getMostRecentRepo(repoDayCounts);

    return {
      ok: true,
      status: response.status,
      data: {
        username,
        total_commits:
          Math.max(0, Math.floor(Number(collection?.totalCommitContributions || 0))) ||
          Object.values(dayCounts).reduce((sum, count) => sum + Number(count || 0), 0),
        current_streak: streak.current,
        longest_streak: streak.longest,
        last_repo: lastRepo,
        active_days_30: countActiveDays(dayCounts, 30),
        active_days_90: countActiveDays(dayCounts, 90),
        top_repo_recent: topRepo.repo,
        recent_commits_7: sumCommitsWithinWindow(dayCounts, 7),
        recent_commits_30: sumCommitsWithinWindow(dayCounts, 30),
        last_updated: new Date().toISOString(),
        source: "graphql_commit_contributions",
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error?.message || "Failed to fetch commit contribution stats",
    };
  }
}

export async function fetchGithubCommitContributionStats({ username, token = "" }) {
  const normalizedUsername = normalizeGithubUsername(username);
  if (!normalizedUsername) {
    return {
      ok: false,
      status: 400,
      error: "GitHub username is required",
    };
  }

  const now = new Date();
  const from = new Date(now.getTime() - 370 * DAY_MS);
  return fetchTokenCommitContributionStats({
    username: normalizedUsername,
    token,
    from,
    to: now,
  });
}

export async function fetchGithubContributionCalendar({ username, token = "" }) {
  const normalizedUsername = normalizeGithubUsername(username);
  if (!normalizedUsername) {
    return {
      ok: false,
      status: 400,
      error: "GitHub username is required",
    };
  }

  const now = new Date();
  const from = new Date(now.getTime() - 370 * DAY_MS);
  let tokenResult = null;

  if (token) {
    tokenResult = await fetchTokenContributionCalendar({
      username: normalizedUsername,
      token,
      from,
      to: now,
    });

    if (tokenResult.ok) {
      return tokenResult;
    }
  }

  const publicResult = await fetchPublicContributionCalendar({
    username: normalizedUsername,
    from,
    to: now,
  });

  if (publicResult.ok) {
    return publicResult;
  }

  return tokenResult || publicResult;
}
