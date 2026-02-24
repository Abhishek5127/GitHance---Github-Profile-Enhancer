import { createGithubInstallationToken, isGithubAppConfigured } from "@/app/lib/githubAppAuth";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";
const STATS_TYPES = new Set(["contribution", "streak", "repo"]);

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function decodeGithubContent(content, encoding = "base64") {
  const normalizedContent = String(content || "")
    .replace(/\r?\n/g, "")
    .trim();

  if (!normalizedContent) return "";
  if (String(encoding || "").toLowerCase() !== "base64") {
    return normalizedContent;
  }

  return Buffer.from(normalizedContent, "base64").toString("utf8");
}

function encodeGithubContent(content) {
  return Buffer.from(String(content || ""), "utf8").toString("base64");
}

function resolveRenderBaseUrl() {
  const explicit = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || "")
    .trim()
    .replace(/\/$/, "");
  if (explicit) return explicit;

  const vercelHost = String(process.env.VERCEL_URL || "").trim();
  if (vercelHost) {
    const prefixed = /^https?:\/\//i.test(vercelHost)
      ? vercelHost
      : `https://${vercelHost}`;
    return prefixed.replace(/\/$/, "");
  }

  return "";
}

function updateStatsQueryParams(urlValue, { username, installationId, cacheKey }) {
  let parsed;
  try {
    parsed = new URL(urlValue);
  } catch {
    return { url: urlValue, changed: false };
  }

  if (!parsed.pathname.endsWith("/api/render")) {
    return { url: urlValue, changed: false };
  }

  const type = String(parsed.searchParams.get("type") || "").toLowerCase();
  if (!STATS_TYPES.has(type)) {
    return { url: urlValue, changed: false };
  }

  let changed = false;
  const preferredBase = resolveRenderBaseUrl();
  if (preferredBase) {
    try {
      const preferredUrl = new URL(preferredBase);
      if (
        parsed.protocol !== preferredUrl.protocol ||
        parsed.host !== preferredUrl.host
      ) {
        parsed.protocol = preferredUrl.protocol;
        parsed.host = preferredUrl.host;
        changed = true;
      }
    } catch {
      // Ignore invalid preferred base URL values.
    }
  }

  if (parsed.searchParams.has("snapshot")) {
    parsed.searchParams.delete("snapshot");
    changed = true;
  }

  if (username) {
    const currentUser = String(
      parsed.searchParams.get("user") || parsed.searchParams.get("username") || ""
    )
      .trim()
      .toLowerCase();
    if (currentUser !== username) {
      parsed.searchParams.set("user", username);
      parsed.searchParams.delete("username");
      changed = true;
    }
  }

  if (installationId) {
    const currentInstallation = String(
      parsed.searchParams.get("installation_id") ||
        parsed.searchParams.get("installationId") ||
        ""
    ).trim();
    if (currentInstallation !== String(installationId)) {
      parsed.searchParams.set("installation_id", String(installationId));
      parsed.searchParams.delete("installationId");
      changed = true;
    }
  }

  const nextCacheKey = String(cacheKey || "");
  const currentCacheKey = String(
    parsed.searchParams.get("stats_ts") ||
      parsed.searchParams.get("ts") ||
      parsed.searchParams.get("t") ||
      ""
  );
  if (nextCacheKey && currentCacheKey !== nextCacheKey) {
    parsed.searchParams.delete("ts");
    parsed.searchParams.delete("t");
    parsed.searchParams.set("stats_ts", nextCacheKey);
    changed = true;
  }

  const nextUrl = parsed.toString();
  return {
    url: nextUrl,
    changed: changed || nextUrl !== urlValue,
  };
}

function rewriteStatsUrlsInMarkdown(markdown, context) {
  let updates = 0;

  const rewriteUrl = (source) => {
    const outcome = updateStatsQueryParams(source, context);
    if (outcome.changed) {
      updates += 1;
    }
    return outcome.url;
  };

  let next = String(markdown || "");

  // Update HTML image tags: <img src="...">
  next = next.replace(
    /src=(["'])(https?:\/\/[^"']+\/api\/render\?[^"']+)\1/gi,
    (full, quote, url) => `src=${quote}${rewriteUrl(url)}${quote}`
  );

  // Update markdown image syntax: ![alt](...)
  next = next.replace(
    /!\[[^\]]*]\((https?:\/\/[^)\s]+\/api\/render\?[^)\s]+)\)/gi,
    (full, url) => full.replace(url, rewriteUrl(url))
  );

  return {
    markdown: next,
    updates,
  };
}

async function fetchProfileReadme({ username, token }) {
  const repo = username;
  const path = "README.md";
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(username)}/${encodeURIComponent(
      repo
    )}/contents/${encodeURIComponent(path)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
    }
  );

  if (response.status === 404) {
    return {
      ok: false,
      status: 404,
      reason: "profile_readme_not_found",
    };
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      reason: String(payload?.message || "Failed to fetch profile README"),
    };
  }

  return {
    ok: true,
    status: 200,
    repo,
    path,
    sha: String(payload?.sha || ""),
    content: decodeGithubContent(payload?.content, payload?.encoding),
  };
}

async function pushProfileReadme({ username, repo, path, sha, content, token, message }) {
  const response = await fetch(
    `${GITHUB_API}/repos/${encodeURIComponent(username)}/${encodeURIComponent(
      repo
    )}/contents/${encodeURIComponent(path)}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": GITHUB_API_VERSION,
      },
      body: JSON.stringify({
        message,
        content: encodeGithubContent(content),
        sha,
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      reason: String(payload?.message || "Failed to update profile README"),
    };
  }

  return {
    ok: true,
    status: response.status,
    commit_sha: String(payload?.commit?.sha || ""),
  };
}

export async function syncStatsReadmeForPush({
  username,
  installationId,
  cacheKey = "",
}) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedInstallationId = Number(installationId);

  if (!normalizedUsername) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_username",
      status: 400,
    };
  }

  if (!Number.isFinite(normalizedInstallationId) || normalizedInstallationId <= 0) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_installation_id",
      status: 400,
    };
  }

  if (!isGithubAppConfigured()) {
    return {
      ok: false,
      skipped: true,
      reason: "github_app_not_configured",
      status: 412,
    };
  }

  try {
    const tokenResponse = await createGithubInstallationToken(
      normalizedInstallationId
    );
    const token = tokenResponse.token;

    const readme = await fetchProfileReadme({
      username: normalizedUsername,
      token,
    });

    if (!readme.ok) {
      return {
        ok: false,
        skipped: true,
        reason: readme.reason,
        status: readme.status,
      };
    }

    const rewritten = rewriteStatsUrlsInMarkdown(readme.content, {
      username: normalizedUsername,
      installationId: normalizedInstallationId,
      cacheKey: String(cacheKey || Date.now()),
    });

    if (!rewritten.updates || rewritten.markdown === readme.content) {
      return {
        ok: true,
        skipped: true,
        reason: "no_stats_urls_to_refresh",
        status: 200,
      };
    }

    const message = `chore: refresh GitHance stats (${new Date().toISOString()})`;
    const pushResult = await pushProfileReadme({
      username: normalizedUsername,
      repo: readme.repo,
      path: readme.path,
      sha: readme.sha,
      content: rewritten.markdown,
      token,
      message,
    });

    if (!pushResult.ok) {
      return {
        ok: false,
        skipped: true,
        reason: pushResult.reason,
        status: pushResult.status,
      };
    }

    return {
      ok: true,
      skipped: false,
      status: pushResult.status,
      commit_sha: pushResult.commit_sha,
      updated_urls: rewritten.updates,
    };
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      reason: String(error?.message || "Failed to sync README stats"),
      status: 500,
    };
  }
}
