import fs from "node:fs/promises";
import path from "node:path";

const START_MARKER = "<!-- GH_ENHANCER_STATS:START -->";
const END_MARKER = "<!-- GH_ENHANCER_STATS:END -->";
const DEFAULT_OUTPUT_DIR = "assets/readme";
const DEFAULT_README_PATH = "README.md";

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;

    const withoutPrefix = token.slice(2);
    const eqIndex = withoutPrefix.indexOf("=");

    if (eqIndex !== -1) {
      const key = withoutPrefix.slice(0, eqIndex);
      const value = withoutPrefix.slice(eqIndex + 1);
      parsed[key] = value;
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[withoutPrefix] = next;
      index += 1;
      continue;
    }

    parsed[withoutPrefix] = "true";
  }

  return parsed;
}

function escapeXml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function githubJson(url, { token, method = "GET", body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "github-enhancer-readme-assets",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new Error(
      `GitHub API ${response.status} at ${url}: ${data?.message || response.statusText}`
    );
  }

  return data;
}

async function githubGraphql({ token, query, variables }) {
  if (!token) return null;

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "github-enhancer-readme-assets",
    },
    body: JSON.stringify({ query, variables }),
  });

  const payload = await response.json();
  if (!response.ok || payload?.errors?.length) {
    const message =
      payload?.errors?.[0]?.message || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(`GitHub GraphQL error: ${message}`);
  }

  return payload.data || null;
}

async function fetchRepositories(username, token) {
  const repos = [];

  for (let page = 1; page <= 10; page += 1) {
    const pageRepos = await githubJson(
      `https://api.github.com/users/${username}/repos?type=owner&sort=updated&per_page=100&page=${page}`,
      { token }
    );

    if (!Array.isArray(pageRepos) || pageRepos.length === 0) break;
    repos.push(...pageRepos);
    if (pageRepos.length < 100) break;
  }

  return repos.filter((repo) => !repo?.fork);
}

function collectLanguageStats(repos) {
  const stats = new Map();

  repos.forEach((repo) => {
    const name = String(repo?.language || "").trim();
    if (!name) return;

    const current = stats.get(name) || { count: 0, stars: 0 };
    current.count += 1;
    current.stars += Number(repo?.stargazers_count || 0);
    stats.set(name, current);
  });

  return [...stats.entries()]
    .map(([language, values]) => ({ language, ...values }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      if (b.stars !== a.stars) return b.stars - a.stars;
      return a.language.localeCompare(b.language);
    });
}

async function fetchContributionData(username, token) {
  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(now.getFullYear() - 1);

  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
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
        }
      }
    }
  `;

  const data = await githubGraphql({
    token,
    query,
    variables: {
      login: username,
      from: yearAgo.toISOString(),
      to: now.toISOString(),
    },
  });

  const collection = data?.user?.contributionsCollection;
  if (!collection) return null;

  const days = (collection.contributionCalendar?.weeks || [])
    .flatMap((week) => week?.contributionDays || [])
    .map((day) => ({
      date: String(day?.date || ""),
      count: Number(day?.contributionCount || 0),
    }))
    .filter((day) => day.date)
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalContributions: Number(collection.contributionCalendar?.totalContributions || 0),
    totalCommits: Number(collection.totalCommitContributions || 0),
    totalIssues: Number(collection.totalIssueContributions || 0),
    totalPullRequests: Number(collection.totalPullRequestContributions || 0),
    totalReviews: Number(collection.totalPullRequestReviewContributions || 0),
    days,
  };
}

function computeStreak(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { current: 0, longest: 0 };
  }

  let longest = 0;
  let running = 0;

  for (const day of days) {
    if (day.count > 0) {
      running += 1;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  }

  let current = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].count > 0) current += 1;
    else break;
  }

  return { current, longest };
}

function getLastNDays(days, limit = 30) {
  const safe = Array.isArray(days) ? days : [];
  const slice = safe.slice(-limit);
  if (slice.length === limit) return slice;

  const fillers = Array.from({ length: limit - slice.length }).map((_, index) => ({
    date: `na-${index}`,
    count: 0,
  }));

  return [...fillers, ...slice];
}

function buildStatsSvg(data) {
  const cards = [
    { label: "Public Repos", value: data.publicRepos },
    { label: "Followers", value: data.followers },
    { label: "Following", value: data.following },
    { label: "Stars", value: data.totalStars },
    { label: "Forks", value: data.totalForks },
    { label: "Contributions (1y)", value: data.totalContributions },
  ];

  const cardWidth = 150;
  const cardHeight = 56;
  const cols = 3;
  const gap = 12;
  const startX = 20;
  const startY = 72;

  const cardSvg = cards
    .map((card, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = startX + col * (cardWidth + gap);
      const y = startY + row * (cardHeight + gap);

      return `
    <g>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="10" fill="#111927" stroke="#233247" />
      <text x="${x + 12}" y="${y + 22}" class="label">${escapeXml(card.label)}</text>
      <text x="${x + 12}" y="${y + 43}" class="value">${escapeXml(formatNumber(card.value))}</text>
    </g>`;
    })
    .join("");

  return `
<svg width="520" height="218" viewBox="0 0 520 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub stats for ${escapeXml(
    data.username
  )}">
  <style>
    .title { fill: #e5edf7; font: 700 18px 'Segoe UI', Ubuntu, sans-serif; }
    .meta { fill: #8fa0b8; font: 500 11px 'Segoe UI', Ubuntu, sans-serif; }
    .label { fill: #9eb0ca; font: 600 11px 'Segoe UI', Ubuntu, sans-serif; }
    .value { fill: #f8fbff; font: 700 16px 'Segoe UI', Ubuntu, sans-serif; }
  </style>
  <rect x="8" y="8" width="504" height="202" rx="10" fill="none" stroke="#1f2b3d" />
  <text x="20" y="34" class="title">${escapeXml(data.username)} - GitHub Stats</text>
  <text x="20" y="52" class="meta">Last generated: ${escapeXml(data.updatedAt)}</text>
  ${cardSvg}
</svg>`.trim();
}

function buildStreakSvg(data) {
  const counts = data.last30Days.map((day) => Number(day.count || 0));
  const max = Math.max(...counts, 1);
  const barWidth = 9;
  const barGap = 3;
  const chartX = 24;
  const chartY = 188;

  const bars = counts
    .map((count, index) => {
      const height = Math.max(2, Math.round((count / max) * 52));
      const x = chartX + index * (barWidth + barGap);
      const y = chartY - height;
      const opacity = 0.25 + count / (max * 1.4);

      return `<rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="3" fill="#38bdf8" fill-opacity="${opacity}" />`;
    })
    .join("");

  return `
<svg width="520" height="218" viewBox="0 0 520 218" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="GitHub streak for ${escapeXml(
    data.username
  )}">
  <style>
    .title { fill: #e5edf7; font: 700 18px 'Segoe UI', Ubuntu, sans-serif; }
    .meta { fill: #8fa0b8; font: 500 11px 'Segoe UI', Ubuntu, sans-serif; }
    .label { fill: #9eb0ca; font: 600 11px 'Segoe UI', Ubuntu, sans-serif; }
    .value { fill: #f8fbff; font: 700 24px 'Segoe UI', Ubuntu, sans-serif; }
    .small { fill: #d6e2f0; font: 600 12px 'Segoe UI', Ubuntu, sans-serif; }
  </style>
  <rect x="8" y="8" width="504" height="202" rx="10" fill="none" stroke="#1f2b3d" />
  <text x="20" y="34" class="title">${escapeXml(data.username)} - Activity Streak</text>
  <text x="20" y="52" class="meta">Last generated: ${escapeXml(data.updatedAt)}</text>

  <text x="24" y="82" class="label">Current streak</text>
  <text x="24" y="108" class="value">${escapeXml(formatNumber(data.currentStreak))}</text>
  <text x="108" y="108" class="small">days</text>

  <text x="220" y="82" class="label">Longest streak</text>
  <text x="220" y="108" class="value">${escapeXml(formatNumber(data.longestStreak))}</text>
  <text x="307" y="108" class="small">days</text>

  <text x="380" y="82" class="label">Commits / PRs / Issues / Reviews</text>
  <text x="380" y="108" class="small">
    ${escapeXml(formatNumber(data.totalCommits))} / ${escapeXml(formatNumber(
    data.totalPullRequests
  ))} / ${escapeXml(formatNumber(data.totalIssues))} / ${escapeXml(formatNumber(data.totalReviews))}
  </text>

  <line x1="24" y1="140" x2="496" y2="140" stroke="#1f2b3d" />
  <text x="24" y="156" class="label">Last 30 days contributions</text>
  ${bars}
</svg>`.trim();
}

function buildLanguagesSvg(data) {
  const top = data.languageStats.slice(0, 6);
  const total = top.reduce((sum, entry) => sum + entry.count, 0) || 1;

  const rows = top
    .map((entry, index) => {
      const y = 74 + index * 28;
      const ratio = entry.count / total;
      const pct = Math.round(ratio * 100);
      const width = Math.max(8, Math.round(ratio * 280));

      return `
    <g>
      <text x="22" y="${y + 12}" class="language">${escapeXml(entry.language)}</text>
      <rect x="170" y="${y}" width="290" height="16" rx="8" fill="#111927" />
      <rect x="170" y="${y}" width="${width}" height="16" rx="8" fill="#22d3ee" />
      <text x="468" y="${y + 12}" class="count">${escapeXml(formatNumber(entry.count))} (${pct}%)</text>
    </g>`;
    })
    .join("");

  return `
<svg width="520" height="248" viewBox="0 0 520 248" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Top languages for ${escapeXml(
    data.username
  )}">
  <style>
    .title { fill: #e5edf7; font: 700 18px 'Segoe UI', Ubuntu, sans-serif; }
    .meta { fill: #8fa0b8; font: 500 11px 'Segoe UI', Ubuntu, sans-serif; }
    .language { fill: #dbe7f5; font: 600 12px 'Segoe UI', Ubuntu, sans-serif; }
    .count { fill: #9eb0ca; font: 600 11px 'Segoe UI', Ubuntu, sans-serif; text-anchor: end; }
    .helper { fill: #7f91ab; font: 500 11px 'Segoe UI', Ubuntu, sans-serif; }
  </style>
  <rect x="8" y="8" width="504" height="232" rx="10" fill="none" stroke="#1f2b3d" />
  <text x="20" y="34" class="title">${escapeXml(data.username)} - Top Languages</text>
  <text x="20" y="52" class="meta">Based on ${escapeXml(formatNumber(data.repoCount))} non-fork repos - generated ${escapeXml(
    data.updatedAt
  )}</text>
  ${rows || '<text x="20" y="86" class="helper">No language data found.</text>'}
</svg>`.trim();
}

function buildManagedReadmeBlock() {
  return `${START_MARKER}
## GitHub Insights

<p align="center">
  <img src="./assets/readme/github-stats.svg" alt="GitHub stats" />
  <img src="./assets/readme/github-streak.svg" alt="GitHub streak" />
</p>

<p align="center">
  <img src="./assets/readme/top-languages.svg" alt="Top languages" />
</p>
${END_MARKER}`;
}

function upsertManagedReadmeBlock(content, block) {
  const normalized = String(content || "");
  const markerRegex = new RegExp(
    `${escapeRegex(START_MARKER)}[\\s\\S]*?${escapeRegex(END_MARKER)}`,
    "m"
  );

  if (markerRegex.test(normalized)) {
    return normalized.replace(markerRegex, block);
  }

  if (!normalized.trim()) {
    return `${block}\n`;
  }

  return `${normalized.replace(/\s*$/, "")}\n\n${block}\n`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help === "true" || args.h === "true") {
    console.log(`Usage: npm run readme:assets -- --username <login> [--token <token>] [--no-readme]

Env alternatives:
- GITHUB_USERNAME
- GITHUB_TOKEN
- README_PATH (default: README.md)
- README_ASSET_DIR (default: assets/readme)
`);
    return;
  }

  const username = String(
    args.username || process.env.GITHUB_USERNAME || process.env.GH_USERNAME || ""
  ).trim();
  const token = String(args.token || process.env.GITHUB_TOKEN || "").trim();
  const readmePath = path.resolve(
    process.cwd(),
    args["readme-path"] || process.env.README_PATH || DEFAULT_README_PATH
  );
  const outputDir = path.resolve(
    process.cwd(),
    args["asset-dir"] || process.env.README_ASSET_DIR || DEFAULT_OUTPUT_DIR
  );
  const skipReadme = args["no-readme"] === "true";

  if (!username) {
    throw new Error("Missing GitHub username. Set GITHUB_USERNAME or pass --username.");
  }

  console.log(`Generating README assets for ${username}...`);

  const profile = await githubJson(`https://api.github.com/users/${username}`, { token });
  const repos = await fetchRepositories(username, token);
  const languageStats = collectLanguageStats(repos);

  let contributionData = null;
  try {
    contributionData = await fetchContributionData(username, token);
  } catch (error) {
    console.warn(`GraphQL contribution fetch failed: ${error.message}`);
    console.warn("Continuing with fallback zeros for contribution detail.");
  }

  const days = contributionData?.days || [];
  const streak = computeStreak(days);
  const last30Days = getLastNDays(days, 30);
  const updatedAt = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  const totalStars = repos.reduce((sum, repo) => sum + Number(repo?.stargazers_count || 0), 0);
  const totalForks = repos.reduce((sum, repo) => sum + Number(repo?.forks_count || 0), 0);

  const statsSvg = buildStatsSvg({
    username,
    updatedAt,
    publicRepos: Number(profile?.public_repos || repos.length),
    followers: Number(profile?.followers || 0),
    following: Number(profile?.following || 0),
    totalStars,
    totalForks,
    totalContributions: Number(contributionData?.totalContributions || 0),
  });

  const streakSvg = buildStreakSvg({
    username,
    updatedAt,
    currentStreak: streak.current,
    longestStreak: streak.longest,
    totalCommits: Number(contributionData?.totalCommits || 0),
    totalPullRequests: Number(contributionData?.totalPullRequests || 0),
    totalIssues: Number(contributionData?.totalIssues || 0),
    totalReviews: Number(contributionData?.totalReviews || 0),
    last30Days,
  });

  const languagesSvg = buildLanguagesSvg({
    username,
    updatedAt,
    languageStats,
    repoCount: repos.length,
  });

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, "github-stats.svg"), `${statsSvg}\n`, "utf8"),
    fs.writeFile(path.join(outputDir, "github-streak.svg"), `${streakSvg}\n`, "utf8"),
    fs.writeFile(path.join(outputDir, "top-languages.svg"), `${languagesSvg}\n`, "utf8"),
  ]);

  if (!skipReadme) {
    let existingReadme = "";
    try {
      existingReadme = await fs.readFile(readmePath, "utf8");
    } catch {
      existingReadme = "";
    }

    const nextReadme = upsertManagedReadmeBlock(
      existingReadme,
      buildManagedReadmeBlock()
    );
    await fs.writeFile(readmePath, nextReadme, "utf8");
  }

  console.log("Generated files:");
  console.log(`- ${path.relative(process.cwd(), path.join(outputDir, "github-stats.svg"))}`);
  console.log(`- ${path.relative(process.cwd(), path.join(outputDir, "github-streak.svg"))}`);
  console.log(`- ${path.relative(process.cwd(), path.join(outputDir, "top-languages.svg"))}`);
  if (!skipReadme) {
    console.log(`- ${path.relative(process.cwd(), readmePath)} managed stats block`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});


