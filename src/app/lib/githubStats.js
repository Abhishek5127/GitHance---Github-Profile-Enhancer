import { getMongoDb, isMongoConfigured } from "@/app/lib/mongodb";

const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_WINDOW_DAYS = 180;
const RECENT_ACTIVITY_WINDOW_DAYS = 30;
const ACTIVE_DAYS_LONG_WINDOW_DAYS = 90;
const DELIVERY_TTL_MS = 14 * DAY_MS;
const WEBHOOK_DELIVERY_TTL_DAYS = 14;
const STATS_COLLECTION = "github_user_stats";
const DELIVERIES_COLLECTION = "github_webhook_deliveries";

function createStore() {
  return {
    userStats: new Map(),
    processedDeliveries: new Map(),
  };
}

function getStore() {
  if (!globalThis.__githanceGithubStatsStore) {
    globalThis.__githanceGithubStatsStore = createStore();
  }

  return globalThis.__githanceGithubStatsStore;
}

function createStatsDocId({ username, installationId }) {
  return statsKey({ username, installationId });
}

function deliveryExpiryDate() {
  return new Date(Date.now() + WEBHOOK_DELIVERY_TTL_DAYS * DAY_MS);
}

let mongoIndexesEnsured = false;

async function getMongoCollections() {
  const db = await getMongoDb();

  if (!mongoIndexesEnsured) {
    const statsCollection = db.collection(STATS_COLLECTION);
    const deliveriesCollection = db.collection(DELIVERIES_COLLECTION);

    await Promise.all([
      statsCollection.createIndex({ github_username: 1, installation_id: 1 }),
      deliveriesCollection.createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      ),
    ]);

    mongoIndexesEnsured = true;
  }

  return {
    statsCollection: db.collection(STATS_COLLECTION),
    deliveriesCollection: db.collection(DELIVERIES_COLLECTION),
  };
}

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizeInstallationId(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.floor(parsed);
}

function normalizeRepoFullName(repo) {
  if (!repo || typeof repo !== "object") return "";

  const fullName = String(repo.full_name || "")
    .trim()
    .toLowerCase();
  if (fullName) return fullName;

  const owner = normalizeUsername(repo?.owner?.login);
  const name = String(repo?.name || "")
    .trim()
    .toLowerCase();

  if (!owner || !name) return "";
  return `${owner}/${name}`;
}

function statsKey({ username, installationId }) {
  return `${installationId ?? "none"}:${username}`;
}

function isoDay(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function todayIsoDay() {
  return new Date().toISOString().slice(0, 10);
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

function isoToEpoch(value) {
  const parsed = Date.parse(value || "");
  if (!Number.isFinite(parsed)) return 0;
  return parsed;
}

function makeEmptyStats({ username, installationId }) {
  return {
    github_username: username,
    installation_id: installationId,
    total_commits: 0,
    current_streak: 0,
    longest_streak: 0,
    last_repo: "",
    active_days_30: 0,
    active_days_90: 0,
    top_repo_recent: "",
    recent_commits_7: 0,
    recent_commits_30: 0,
    last_updated: "",
    day_counts: {},
    repo_day_counts: {},
  };
}

function ensureStatsRecord(store, { username, installationId }) {
  const key = statsKey({ username, installationId });
  const existing = store.userStats.get(key);
  if (existing) return existing;

  const created = makeEmptyStats({ username, installationId });
  store.userStats.set(key, created);
  return created;
}

function cloneDayCounts(dayCounts = {}) {
  return Object.entries(dayCounts).reduce((result, [day, count]) => {
    if (count > 0) {
      result[day] = Number(count);
    }
    return result;
  }, {});
}

function cloneRepoDayCounts(repoDayCounts = {}) {
  return Object.entries(repoDayCounts).reduce((result, [repo, dayCounts]) => {
    const cloned = cloneDayCounts(dayCounts);
    if (Object.keys(cloned).length) {
      result[repo] = cloned;
    }
    return result;
  }, {});
}

function normalizeStatsFromRecord(record, { username, installationId }) {
  const normalized = makeEmptyStats({
    username,
    installationId,
  });

  if (!record || typeof record !== "object") {
    return normalized;
  }

  normalized.total_commits = Number(record.total_commits || 0);
  normalized.current_streak = Number(record.current_streak || 0);
  normalized.longest_streak = Number(record.longest_streak || 0);
  normalized.last_repo = String(record.last_repo || "")
    .trim()
    .toLowerCase();
  normalized.active_days_30 = Number(record.active_days_30 || 0);
  normalized.active_days_90 = Number(record.active_days_90 || 0);
  normalized.top_repo_recent = String(record.top_repo_recent || "")
    .trim()
    .toLowerCase();
  normalized.recent_commits_7 = Number(record.recent_commits_7 || 0);
  normalized.recent_commits_30 = Number(record.recent_commits_30 || 0);
  normalized.last_updated = String(record.last_updated || "");
  normalized.day_counts = cloneDayCounts(record.day_counts || {});
  normalized.repo_day_counts = cloneRepoDayCounts(record.repo_day_counts || {});

  pruneStatsHistory(normalized);
  deriveStats(normalized);
  return normalized;
}

function toStatsPersistenceDoc(stats) {
  return {
    _id: createStatsDocId({
      username: normalizeUsername(stats.github_username),
      installationId: normalizeInstallationId(stats.installation_id),
    }),
    github_username: normalizeUsername(stats.github_username),
    installation_id: normalizeInstallationId(stats.installation_id),
    total_commits: Number(stats.total_commits || 0),
    current_streak: Number(stats.current_streak || 0),
    longest_streak: Number(stats.longest_streak || 0),
    last_repo: String(stats.last_repo || "")
      .trim()
      .toLowerCase(),
    active_days_30: Number(stats.active_days_30 || 0),
    active_days_90: Number(stats.active_days_90 || 0),
    top_repo_recent: String(stats.top_repo_recent || "")
      .trim()
      .toLowerCase(),
    recent_commits_7: Number(stats.recent_commits_7 || 0),
    recent_commits_30: Number(stats.recent_commits_30 || 0),
    last_updated: String(stats.last_updated || ""),
    day_counts: cloneDayCounts(stats.day_counts || {}),
    repo_day_counts: cloneRepoDayCounts(stats.repo_day_counts || {}),
    updatedAt: new Date(),
  };
}

async function reserveWebhookDelivery(deliveriesCollection, deliveryId) {
  if (!deliveryId) {
    return { reserved: true, idempotent: false };
  }

  const result = await deliveriesCollection.updateOne(
    { _id: deliveryId },
    {
      $setOnInsert: {
        _id: deliveryId,
        createdAt: new Date(),
        expiresAt: deliveryExpiryDate(),
      },
    },
    { upsert: true }
  );

  const reserved = Boolean(result.upsertedCount);
  return {
    reserved,
    idempotent: !reserved,
  };
}

async function releaseWebhookDelivery(deliveriesCollection, deliveryId) {
  if (!deliveryId) return;
  await deliveriesCollection.deleteOne({ _id: deliveryId });
}

async function loadStatsRecordFromMongo(statsCollection, { username, installationId }) {
  const record = await statsCollection.findOne({
    _id: createStatsDocId({ username, installationId }),
  });

  if (!record) return null;
  return normalizeStatsFromRecord(record, {
    username,
    installationId,
  });
}

async function loadStatsRecordsFromMongo(
  statsCollection,
  { username, installationId = null }
) {
  const query = {
    github_username: username,
  };

  if (installationId !== null) {
    query.installation_id = installationId;
  }

  const records = await statsCollection.find(query).toArray();
  return records.map((record) =>
    normalizeStatsFromRecord(record, {
      username: normalizeUsername(record.github_username),
      installationId: normalizeInstallationId(record.installation_id),
    })
  );
}

async function saveStatsRecordToMongo(statsCollection, stats) {
  const doc = toStatsPersistenceDoc(stats);
  await statsCollection.replaceOne({ _id: doc._id }, doc, { upsert: true });
}

function cleanupProcessedDeliveries(store) {
  const cutoff = Date.now() - DELIVERY_TTL_MS;

  for (const [deliveryId, seenAt] of store.processedDeliveries.entries()) {
    if (seenAt < cutoff) {
      store.processedDeliveries.delete(deliveryId);
    }
  }
}

function hasProcessedDelivery(store, deliveryId) {
  if (!deliveryId) return false;
  cleanupProcessedDeliveries(store);
  return store.processedDeliveries.has(deliveryId);
}

function markDeliveryProcessed(store, deliveryId) {
  if (!deliveryId) return;
  store.processedDeliveries.set(deliveryId, Date.now());
  cleanupProcessedDeliveries(store);
}

function incrementCounter(map, key, increment = 1) {
  if (!key || !Number.isFinite(increment) || increment === 0) return;
  map[key] = Number(map[key] || 0) + increment;
  if (map[key] <= 0) {
    delete map[key];
  }
}

function mergeDayCounts(target, source) {
  Object.entries(source || {}).forEach(([day, count]) => {
    incrementCounter(target, day, Number(count || 0));
  });
}

function buildDayIncrementsFromPush(payload) {
  const dayIncrements = {};
  const commits = Array.isArray(payload?.commits) ? payload.commits : [];
  const eventSize = Number(payload?.size);

  const commitCountFromPayload =
    Number.isFinite(eventSize) && eventSize > 0
      ? Math.floor(eventSize)
      : commits.length;

  commits.forEach((commit) => {
    const day = isoDay(commit?.timestamp || commit?.author?.date);
    if (!day) return;
    incrementCounter(dayIncrements, day, 1);
  });

  const knownCommitCount = Object.values(dayIncrements).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );
  const missingCommitCount = Math.max(0, commitCountFromPayload - knownCommitCount);

  if (missingCommitCount > 0) {
    const fallbackDay =
      isoDay(payload?.head_commit?.timestamp) ||
      isoDay(payload?.repository?.pushed_at) ||
      todayIsoDay();
    incrementCounter(dayIncrements, fallbackDay, missingCommitCount);
  }

  const commitCount = Object.values(dayIncrements).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );

  return {
    dayIncrements,
    commitCount,
  };
}

function getCommitCountFromPushPayload(payload) {
  const eventSize = Number(payload?.size);
  if (Number.isFinite(eventSize) && eventSize > 0) {
    return Math.floor(eventSize);
  }

  const commits = Array.isArray(payload?.commits) ? payload.commits.length : 0;
  if (commits > 0) {
    return commits;
  }

  return 1;
}

function normalizeRepoNameFromEvent(repoName, fallbackUsername) {
  const normalizedRepo = String(repoName || "")
    .trim()
    .toLowerCase();
  if (!normalizedRepo) return "";

  if (normalizedRepo.includes("/")) {
    return normalizedRepo;
  }

  if (!fallbackUsername) return normalizedRepo;
  return `${fallbackUsername}/${normalizedRepo}`;
}

function pruneDayCountMap(dayCounts, cutoffEpoch) {
  Object.keys(dayCounts || {}).forEach((day) => {
    if (isoDayToEpoch(day) < cutoffEpoch) {
      delete dayCounts[day];
    }
  });
}

function pruneStatsHistory(stats) {
  const cutoffEpoch = Date.now() - (HISTORY_WINDOW_DAYS - 1) * DAY_MS;
  pruneDayCountMap(stats.day_counts, cutoffEpoch);

  Object.keys(stats.repo_day_counts || {}).forEach((repo) => {
    const perDay = stats.repo_day_counts[repo];
    pruneDayCountMap(perDay, cutoffEpoch);
    if (!Object.keys(perDay || {}).length) {
      delete stats.repo_day_counts[repo];
    }
  });
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

  const today = todayIsoDay();
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

function getTopRepoRecent(repoDayCounts, windowDays = RECENT_ACTIVITY_WINDOW_DAYS) {
  const cutoffEpoch = Date.now() - (windowDays - 1) * DAY_MS;
  let topRepo = "";
  let topCommits = 0;

  Object.entries(repoDayCounts || {}).forEach(([repo, dayCounts]) => {
    const repoCommits = Object.entries(dayCounts || {}).reduce(
      (sum, [day, count]) => {
        if (isoDayToEpoch(day) < cutoffEpoch) return sum;
        return sum + Number(count || 0);
      },
      0
    );

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

function deriveStats(stats) {
  const streak = computeStreak(stats.day_counts);

  stats.current_streak = streak.current;
  stats.longest_streak = Math.max(Number(stats.longest_streak || 0), streak.longest);
  stats.active_days_30 = countActiveDays(stats.day_counts, RECENT_ACTIVITY_WINDOW_DAYS);
  stats.active_days_90 = countActiveDays(stats.day_counts, ACTIVE_DAYS_LONG_WINDOW_DAYS);
  stats.recent_commits_7 = sumCommitsWithinWindow(stats.day_counts, 7);
  stats.recent_commits_30 = sumCommitsWithinWindow(
    stats.day_counts,
    RECENT_ACTIVITY_WINDOW_DAYS
  );

  const topRepo = getTopRepoRecent(stats.repo_day_counts, RECENT_ACTIVITY_WINDOW_DAYS);
  stats.top_repo_recent = topRepo.repo;

  const mostRecentRepo = getMostRecentRepo(stats.repo_day_counts);
  if (!stats.last_repo || !stats.repo_day_counts[stats.last_repo]) {
    stats.last_repo = mostRecentRepo || "";
  }
}

function hasMeaningfulStats(stats) {
  if (!stats) return false;

  return (
    Number(stats.total_commits || 0) > 0 ||
    Number(stats.recent_commits_30 || 0) > 0 ||
    Number(stats.active_days_30 || 0) > 0 ||
    Boolean(stats.last_repo) ||
    Boolean(stats.top_repo_recent)
  );
}

function toPublicStats(stats) {
  if (!stats) {
    return {
      github_username: "",
      installation_id: null,
      total_commits: 0,
      current_streak: 0,
      longest_streak: 0,
      last_repo: "",
      active_days_30: 0,
      active_days_90: 0,
      top_repo_recent: "",
      recent_commits_7: 0,
      recent_commits_30: 0,
      last_updated: "",
      contribution_summary: {
        recent_commits_7: 0,
        recent_commits_30: 0,
        active_days_30: 0,
        active_days_90: 0,
      },
    };
  }

  return {
    github_username: stats.github_username,
    installation_id: stats.installation_id,
    total_commits: Number(stats.total_commits || 0),
    current_streak: Number(stats.current_streak || 0),
    longest_streak: Number(stats.longest_streak || 0),
    last_repo: String(stats.last_repo || ""),
    active_days_30: Number(stats.active_days_30 || 0),
    active_days_90: Number(stats.active_days_90 || 0),
    top_repo_recent: String(stats.top_repo_recent || ""),
    recent_commits_7: Number(stats.recent_commits_7 || 0),
    recent_commits_30: Number(stats.recent_commits_30 || 0),
    last_updated: String(stats.last_updated || ""),
    contribution_summary: {
      recent_commits_7: Number(stats.recent_commits_7 || 0),
      recent_commits_30: Number(stats.recent_commits_30 || 0),
      active_days_30: Number(stats.active_days_30 || 0),
      active_days_90: Number(stats.active_days_90 || 0),
    },
  };
}

function mergeStatsRecords(records, { username, installationId }) {
  const merged = makeEmptyStats({
    username,
    installationId,
  });

  let latestUpdated = "";
  let latestUpdatedEpoch = 0;

  records.forEach((record) => {
    merged.total_commits += Number(record.total_commits || 0);
    merged.longest_streak = Math.max(
      Number(merged.longest_streak || 0),
      Number(record.longest_streak || 0)
    );

    mergeDayCounts(merged.day_counts, record.day_counts || {});

    Object.entries(record.repo_day_counts || {}).forEach(([repo, dayCounts]) => {
      if (!merged.repo_day_counts[repo]) {
        merged.repo_day_counts[repo] = {};
      }
      mergeDayCounts(merged.repo_day_counts[repo], dayCounts || {});
    });

    const updatedEpoch = isoToEpoch(record.last_updated);
    if (updatedEpoch >= latestUpdatedEpoch) {
      latestUpdatedEpoch = updatedEpoch;
      latestUpdated = record.last_updated || latestUpdated;
      merged.last_repo = record.last_repo || merged.last_repo;
    }
  });

  merged.last_updated = latestUpdated;
  deriveStats(merged);

  if (!merged.last_repo) {
    merged.last_repo = getMostRecentRepo(merged.repo_day_counts);
  }

  return merged;
}

function upsertPushStats(store, { username, installationId, repoFullName, dayIncrements, commitCount }) {
  const stats = ensureStatsRecord(store, { username, installationId });

  stats.total_commits = Number(stats.total_commits || 0) + Number(commitCount || 0);
  stats.last_updated = new Date().toISOString();

  Object.entries(dayIncrements || {}).forEach(([day, count]) => {
    incrementCounter(stats.day_counts, day, Number(count || 0));
  });

  if (repoFullName) {
    if (!stats.repo_day_counts[repoFullName]) {
      stats.repo_day_counts[repoFullName] = {};
    }

    Object.entries(dayIncrements || {}).forEach(([day, count]) => {
      incrementCounter(stats.repo_day_counts[repoFullName], day, Number(count || 0));
    });

    stats.last_repo = repoFullName;
  }

  pruneStatsHistory(stats);
  deriveStats(stats);
  return stats;
}

function buildSnapshotFromPushEvents({ username, installationId, events }) {
  const snapshot = makeEmptyStats({ username, installationId });
  const pushEvents = Array.isArray(events)
    ? events.filter((event) => String(event?.type || "") === "PushEvent")
    : [];

  let latestEventEpoch = 0;
  let latestRepo = "";

  pushEvents.forEach((event) => {
    const commitCount = getCommitCountFromPushPayload(event?.payload || {});
    const day = isoDay(event?.created_at) || todayIsoDay();
    const repoFullName = normalizeRepoNameFromEvent(event?.repo?.name, username);

    snapshot.total_commits += commitCount;
    incrementCounter(snapshot.day_counts, day, commitCount);

    if (repoFullName) {
      if (!snapshot.repo_day_counts[repoFullName]) {
        snapshot.repo_day_counts[repoFullName] = {};
      }
      incrementCounter(snapshot.repo_day_counts[repoFullName], day, commitCount);
    }

    const eventEpoch = isoToEpoch(event?.created_at);
    if (eventEpoch >= latestEventEpoch) {
      latestEventEpoch = eventEpoch;
      latestRepo = repoFullName || latestRepo;
    }
  });

  snapshot.last_repo = latestRepo;
  snapshot.last_updated = new Date().toISOString();
  pruneStatsHistory(snapshot);
  deriveStats(snapshot);

  if (!snapshot.last_repo) {
    snapshot.last_repo = getMostRecentRepo(snapshot.repo_day_counts) || "";
  }

  return {
    snapshot,
    pushEventsCount: pushEvents.length,
  };
}

function renameRepoForStats(stats, oldRepoFullName, newRepoFullName) {
  if (!oldRepoFullName || !newRepoFullName || oldRepoFullName === newRepoFullName) {
    return false;
  }

  const oldCounts = stats.repo_day_counts?.[oldRepoFullName];
  if (!oldCounts) return false;

  if (!stats.repo_day_counts[newRepoFullName]) {
    stats.repo_day_counts[newRepoFullName] = {};
  }

  mergeDayCounts(stats.repo_day_counts[newRepoFullName], oldCounts);
  delete stats.repo_day_counts[oldRepoFullName];

  if (stats.last_repo === oldRepoFullName) {
    stats.last_repo = newRepoFullName;
  }

  stats.last_updated = new Date().toISOString();
  deriveStats(stats);
  return true;
}

function removeRepoFromStats(stats, repoFullName) {
  if (!repoFullName || !stats.repo_day_counts?.[repoFullName]) return false;

  delete stats.repo_day_counts[repoFullName];

  if (stats.last_repo === repoFullName) {
    stats.last_repo = "";
  }

  stats.last_updated = new Date().toISOString();
  deriveStats(stats);
  return true;
}

function getMatchingRecords(store, { username, installationId = null }) {
  const entries = [...store.userStats.values()].filter((record) => {
    const sameUsername = normalizeUsername(record.github_username) === username;
    if (!sameUsername) return false;

    if (installationId === null) return true;
    return Number(record.installation_id || 0) === Number(installationId);
  });

  return entries;
}

function recordPushEventInMemory({ deliveryId, payload }) {
  const store = getStore();

  if (hasProcessedDelivery(store, deliveryId)) {
    return {
      ok: true,
      idempotent: true,
      reason: "duplicate_delivery",
    };
  }

  const username = normalizeUsername(
    payload?.sender?.login || payload?.repository?.owner?.login || payload?.pusher?.name
  );

  if (!username) {
    return {
      ok: false,
      idempotent: false,
      error: "Unable to resolve GitHub username from webhook payload",
    };
  }

  const installationId = normalizeInstallationId(payload?.installation?.id);
  const repoFullName = normalizeRepoFullName(payload?.repository);
  const { dayIncrements, commitCount } = buildDayIncrementsFromPush(payload);

  const stats = upsertPushStats(store, {
    username,
    installationId,
    repoFullName,
    dayIncrements,
    commitCount,
  });

  markDeliveryProcessed(store, deliveryId);

  return {
    ok: true,
    idempotent: false,
    github_username: username,
    installation_id: installationId,
    repo: repoFullName,
    commits_applied: Number(commitCount || 0),
    stats: toPublicStats(stats),
  };
}

function recordRepositoryEventInMemory({ deliveryId, payload }) {
  const store = getStore();

  if (hasProcessedDelivery(store, deliveryId)) {
    return {
      ok: true,
      idempotent: true,
      reason: "duplicate_delivery",
    };
  }

  const action = String(payload?.action || "").toLowerCase();
  const installationId = normalizeInstallationId(payload?.installation?.id);
  const username = normalizeUsername(
    payload?.repository?.owner?.login || payload?.sender?.login
  );

  if (!username) {
    return {
      ok: false,
      idempotent: false,
      error: "Unable to resolve GitHub username for repository event",
    };
  }

  const records = getMatchingRecords(store, { username, installationId });
  let updatedRecords = 0;

  if (action === "renamed") {
    const previousName = String(payload?.changes?.repository?.name?.from || "")
      .trim()
      .toLowerCase();
    const oldRepoFullName = previousName ? `${username}/${previousName}` : "";
    const newRepoFullName = normalizeRepoFullName(payload?.repository);

    records.forEach((record) => {
      if (renameRepoForStats(record, oldRepoFullName, newRepoFullName)) {
        updatedRecords += 1;
      }
    });
  } else if (action === "deleted") {
    const repoFullName = normalizeRepoFullName(payload?.repository);

    records.forEach((record) => {
      if (removeRepoFromStats(record, repoFullName)) {
        updatedRecords += 1;
      }
    });
  }

  markDeliveryProcessed(store, deliveryId);

  return {
    ok: true,
    idempotent: false,
    action,
    installation_id: installationId,
    github_username: username,
    updated_records: updatedRecords,
  };
}

function bootstrapGithubStatsFromEventsInMemory({
  username,
  installationId = null,
  events = [],
  force = false,
}) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) {
    return {
      ok: false,
      error: "GitHub username is required to bootstrap stats",
    };
  }

  const store = getStore();
  const key = statsKey({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });
  const existing = store.userStats.get(key);

  if (existing && !force && hasMeaningfulStats(existing)) {
    return {
      ok: true,
      bootstrapped: false,
      source: "cache",
      push_events_count: 0,
      stats: toPublicStats(existing),
    };
  }

  const { snapshot, pushEventsCount } = buildSnapshotFromPushEvents({
    username: normalizedUsername,
    installationId: normalizedInstallationId,
    events,
  });

  if (!hasMeaningfulStats(snapshot) && existing && hasMeaningfulStats(existing)) {
    return {
      ok: true,
      bootstrapped: false,
      source: "cache",
      push_events_count: pushEventsCount,
      stats: toPublicStats(existing),
    };
  }

  store.userStats.set(key, snapshot);

  return {
    ok: true,
    bootstrapped: true,
    source: "events",
    push_events_count: pushEventsCount,
    stats: toPublicStats(snapshot),
  };
}

function getGithubStatsForUserInMemory({ username, installationId = null }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) {
    return toPublicStats(null);
  }

  const store = getStore();
  const records = getMatchingRecords(store, {
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });

  if (!records.length) {
    return toPublicStats(
      makeEmptyStats({
        username: normalizedUsername,
        installationId: normalizedInstallationId,
      })
    );
  }

  const merged = mergeStatsRecords(records, {
    username: normalizedUsername,
    installationId: normalizedInstallationId,
  });

  return toPublicStats(merged);
}

function getAllGithubStatsInMemory() {
  const store = getStore();
  return [...store.userStats.values()].map((entry) => toPublicStats(entry));
}

export async function recordPushEvent({ deliveryId, payload }) {
  if (!isMongoConfigured()) {
    return recordPushEventInMemory({ deliveryId, payload });
  }

  const username = normalizeUsername(
    payload?.sender?.login || payload?.repository?.owner?.login || payload?.pusher?.name
  );

  if (!username) {
    return {
      ok: false,
      idempotent: false,
      error: "Unable to resolve GitHub username from webhook payload",
      status: 400,
    };
  }

  const installationId = normalizeInstallationId(payload?.installation?.id);
  const repoFullName = normalizeRepoFullName(payload?.repository);
  const { dayIncrements, commitCount } = buildDayIncrementsFromPush(payload);

  let reservedDelivery = false;
  let deliveriesCollection = null;

  try {
    const collections = await getMongoCollections();
    const { statsCollection } = collections;
    deliveriesCollection = collections.deliveriesCollection;

    const reservation = await reserveWebhookDelivery(
      deliveriesCollection,
      deliveryId
    );
    if (!reservation.reserved) {
      return {
        ok: true,
        idempotent: true,
        reason: "duplicate_delivery",
      };
    }
    reservedDelivery = true;

    const existing = await loadStatsRecordFromMongo(statsCollection, {
      username,
      installationId,
    });

    const eventStore = createStore();
    if (existing) {
      const key = statsKey({ username, installationId });
      eventStore.userStats.set(key, existing);
    }

    const stats = upsertPushStats(eventStore, {
      username,
      installationId,
      repoFullName,
      dayIncrements,
      commitCount,
    });

    await saveStatsRecordToMongo(statsCollection, stats);

    return {
      ok: true,
      idempotent: false,
      github_username: username,
      installation_id: installationId,
      repo: repoFullName,
      commits_applied: Number(commitCount || 0),
      stats: toPublicStats(stats),
    };
  } catch (error) {
    if (reservedDelivery && deliveriesCollection) {
      await releaseWebhookDelivery(deliveriesCollection, deliveryId);
    }

    return {
      ok: false,
      idempotent: false,
      error: error?.message || "Failed to persist push event",
      status: 500,
    };
  }
}

export async function recordRepositoryEvent({ deliveryId, payload }) {
  if (!isMongoConfigured()) {
    return recordRepositoryEventInMemory({ deliveryId, payload });
  }

  const action = String(payload?.action || "").toLowerCase();
  const installationId = normalizeInstallationId(payload?.installation?.id);
  const username = normalizeUsername(
    payload?.repository?.owner?.login || payload?.sender?.login
  );

  if (!username) {
    return {
      ok: false,
      idempotent: false,
      error: "Unable to resolve GitHub username for repository event",
      status: 400,
    };
  }

  let reservedDelivery = false;
  let deliveriesCollection = null;

  try {
    const collections = await getMongoCollections();
    const { statsCollection } = collections;
    deliveriesCollection = collections.deliveriesCollection;

    const reservation = await reserveWebhookDelivery(
      deliveriesCollection,
      deliveryId
    );
    if (!reservation.reserved) {
      return {
        ok: true,
        idempotent: true,
        reason: "duplicate_delivery",
      };
    }
    reservedDelivery = true;

    const records = await loadStatsRecordsFromMongo(statsCollection, {
      username,
      installationId,
    });

    let updatedRecords = 0;

    if (action === "renamed") {
      const previousName = String(payload?.changes?.repository?.name?.from || "")
        .trim()
        .toLowerCase();
      const oldRepoFullName = previousName ? `${username}/${previousName}` : "";
      const newRepoFullName = normalizeRepoFullName(payload?.repository);

      for (const record of records) {
        if (renameRepoForStats(record, oldRepoFullName, newRepoFullName)) {
          updatedRecords += 1;
          await saveStatsRecordToMongo(statsCollection, record);
        }
      }
    } else if (action === "deleted") {
      const repoFullName = normalizeRepoFullName(payload?.repository);

      for (const record of records) {
        if (removeRepoFromStats(record, repoFullName)) {
          updatedRecords += 1;
          await saveStatsRecordToMongo(statsCollection, record);
        }
      }
    }

    return {
      ok: true,
      idempotent: false,
      action,
      installation_id: installationId,
      github_username: username,
      updated_records: updatedRecords,
    };
  } catch (error) {
    if (reservedDelivery && deliveriesCollection) {
      await releaseWebhookDelivery(deliveriesCollection, deliveryId);
    }

    return {
      ok: false,
      idempotent: false,
      error: error?.message || "Failed to persist repository event",
      status: 500,
    };
  }
}

export async function bootstrapGithubStatsFromEvents({
  username,
  installationId = null,
  events = [],
  force = false,
}) {
  if (!isMongoConfigured()) {
    return bootstrapGithubStatsFromEventsInMemory({
      username,
      installationId,
      events,
      force,
    });
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) {
    return {
      ok: false,
      error: "GitHub username is required to bootstrap stats",
      status: 400,
    };
  }

  try {
    const { statsCollection } = await getMongoCollections();
    const existing = await loadStatsRecordFromMongo(statsCollection, {
      username: normalizedUsername,
      installationId: normalizedInstallationId,
    });

    if (existing && !force && hasMeaningfulStats(existing)) {
      return {
        ok: true,
        bootstrapped: false,
        source: "cache",
        push_events_count: 0,
        stats: toPublicStats(existing),
      };
    }

    const { snapshot, pushEventsCount } = buildSnapshotFromPushEvents({
      username: normalizedUsername,
      installationId: normalizedInstallationId,
      events,
    });

    if (!hasMeaningfulStats(snapshot) && existing && hasMeaningfulStats(existing)) {
      return {
        ok: true,
        bootstrapped: false,
        source: "cache",
        push_events_count: pushEventsCount,
        stats: toPublicStats(existing),
      };
    }

    await saveStatsRecordToMongo(statsCollection, snapshot);

    return {
      ok: true,
      bootstrapped: true,
      source: "events",
      push_events_count: pushEventsCount,
      stats: toPublicStats(snapshot),
    };
  } catch (error) {
    return {
      ok: false,
      error: error?.message || "Failed to bootstrap GitHub stats",
      status: 500,
    };
  }
}

export async function getGithubStatsForUser({ username, installationId = null }) {
  if (!isMongoConfigured()) {
    return getGithubStatsForUserInMemory({ username, installationId });
  }

  const normalizedUsername = normalizeUsername(username);
  const normalizedInstallationId = normalizeInstallationId(installationId);

  if (!normalizedUsername) {
    return toPublicStats(null);
  }

  try {
    const { statsCollection } = await getMongoCollections();
    const records = await loadStatsRecordsFromMongo(statsCollection, {
      username: normalizedUsername,
      installationId: normalizedInstallationId,
    });

    if (!records.length) {
      return toPublicStats(
        makeEmptyStats({
          username: normalizedUsername,
          installationId: normalizedInstallationId,
        })
      );
    }

    const merged = mergeStatsRecords(records, {
      username: normalizedUsername,
      installationId: normalizedInstallationId,
    });

    return toPublicStats(merged);
  } catch {
    return getGithubStatsForUserInMemory({
      username: normalizedUsername,
      installationId: normalizedInstallationId,
    });
  }
}

export async function getAllGithubStats() {
  if (!isMongoConfigured()) {
    return getAllGithubStatsInMemory();
  }

  try {
    const { statsCollection } = await getMongoCollections();
    const records = await statsCollection.find({}).toArray();
    return records.map((record) =>
      toPublicStats(
        normalizeStatsFromRecord(record, {
          username: normalizeUsername(record.github_username),
          installationId: normalizeInstallationId(record.installation_id),
        })
      )
    );
  } catch {
    return getAllGithubStatsInMemory();
  }
}

export function clearGithubStatsStore() {
  globalThis.__githanceGithubStatsStore = createStore();
}

export function hydrateGithubStatsStore(records = []) {
  const store = getStore();
  store.userStats.clear();

  records.forEach((record) => {
    const username = normalizeUsername(record?.github_username);
    if (!username) return;

    const installationId = normalizeInstallationId(record?.installation_id);
    const key = statsKey({ username, installationId });

    const hydrated = makeEmptyStats({
      username,
      installationId,
    });

    hydrated.total_commits = Number(record?.total_commits || 0);
    hydrated.current_streak = Number(record?.current_streak || 0);
    hydrated.longest_streak = Number(record?.longest_streak || 0);
    hydrated.last_repo = String(record?.last_repo || "").trim().toLowerCase();
    hydrated.active_days_30 = Number(record?.active_days_30 || 0);
    hydrated.active_days_90 = Number(record?.active_days_90 || 0);
    hydrated.top_repo_recent = String(record?.top_repo_recent || "")
      .trim()
      .toLowerCase();
    hydrated.recent_commits_7 = Number(record?.recent_commits_7 || 0);
    hydrated.recent_commits_30 = Number(record?.recent_commits_30 || 0);
    hydrated.last_updated = String(record?.last_updated || "");
    hydrated.day_counts = cloneDayCounts(record?.day_counts || {});
    hydrated.repo_day_counts = cloneRepoDayCounts(record?.repo_day_counts || {});

    pruneStatsHistory(hydrated);
    deriveStats(hydrated);
    store.userStats.set(key, hydrated);
  });
}
