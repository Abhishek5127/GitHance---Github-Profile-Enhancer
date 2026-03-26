function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatLicense(license) {
  if (!license || typeof license !== "object") return null;
  if (license.spdx_id && license.spdx_id !== "NOASSERTION") return license.spdx_id;
  return license.name || null;
}

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

async function resolveAuthenticatedUsername(headers) {
  try {
    const response = await fetch("https://api.github.com/user", { headers });
    if (!response.ok) return null;

    const payload = await response.json();
    return normalizeUsername(payload?.login);
  } catch {
    return null;
  }
}

function mapRepository(repo, readmeValue = null) {
  return {
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: Boolean(repo.private),
    visibility: repo.visibility || (repo.private ? "private" : "public"),
    description: repo.description,
    html_url: repo.html_url,
    language: repo.language,
    topics: Array.isArray(repo.topics) ? repo.topics : [],
    homepage: repo.homepage || null,
    stargazers_count: repo.stargazers_count ?? 0,
    forks_count: repo.forks_count ?? 0,
    size: repo.size ?? 0,
    created_at: repo.created_at || null,
    updated_at: repo.updated_at || null,
    default_branch: repo.default_branch || null,
    owner: repo.owner?.login || null,
    license: formatLicense(repo.license),
    fork: Boolean(repo.fork),
    archived: Boolean(repo.archived),
    disabled: Boolean(repo.disabled),
    readme: readmeValue,
    hasReadme: Boolean(readmeValue),
  };
}

function buildPublicReposUrl(username, page, perPage) {
  return `https://api.github.com/users/${encodeURIComponent(
    username
  )}/repos?sort=updated&direction=desc&page=${page}&per_page=${perPage}`;
}

function buildAuthenticatedReposUrl(page, perPage) {
  return `https://api.github.com/user/repos?sort=updated&direction=desc&affiliation=owner&visibility=all&page=${page}&per_page=${perPage}`;
}

export async function POST(req) {
  const body = await req.json().catch(() => ({}));
  const username = normalizeUsername(body?.username);
  const page = clamp(toNumber(body?.page, 1), 1, 100);
  const perPage = clamp(toNumber(body?.perPage, 10), 1, 100);
  const token = String(body?.token || "").trim();
  const includeReadme = body?.includeReadme !== false;

  if (!username && !token) {
    return Response.json(
      { error: "Username or GitHub access token required" },
      { status: 400 }
    );
  }

  try {
    const baseHeaders = {
      Accept: "application/vnd.github+json",
    };
    const headers = token
      ? {
          ...baseHeaders,
          Authorization: `Bearer ${token}`,
        }
      : baseHeaders;

    const authenticatedUsername = token
      ? await resolveAuthenticatedUsername(headers)
      : null;

    const canUseAuthenticatedListing =
      Boolean(authenticatedUsername) &&
      (!username || username === authenticatedUsername);

    const authenticatedReposUrl = buildAuthenticatedReposUrl(page, perPage);
    const publicReposUrl = username
      ? buildPublicReposUrl(username, page, perPage)
      : null;

    let reposResponse = null;
    let listingMode = "public";

    if (canUseAuthenticatedListing) {
      reposResponse = await fetch(authenticatedReposUrl, { headers });
      listingMode = "authenticated";
    }

    if ((!reposResponse || !reposResponse.ok) && publicReposUrl) {
      reposResponse = await fetch(publicReposUrl, { headers });
      listingMode = "public";
    }

    if (!reposResponse?.ok) {
      return Response.json(
        {
          error:
            reposResponse?.status === 401
              ? "GitHub authentication failed"
              : "GitHub user not found",
        },
        { status: reposResponse?.status || 404 }
      );
    }

    const repos = await reposResponse.json();
    if (!Array.isArray(repos)) {
      return Response.json(
        { error: "Unexpected GitHub response" },
        { status: 502 }
      );
    }

    if (!includeReadme) {
      return Response.json({
        success: true,
        page,
        perPage,
        listingMode,
        viewer: authenticatedUsername || username || null,
        repos: repos.map((repo) => mapRepository(repo)),
      });
    }

    const reposWithReadmeFlag = await Promise.all(
      repos.map(async (repo) => {
        const owner = repo.owner?.login || authenticatedUsername || username;
        if (!owner) {
          return mapRepository(repo, null);
        }

        try {
          const readmeResponse = await fetch(
            `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(
              repo.name
            )}/readme`,
            { headers }
          );

          return mapRepository(
            repo,
            readmeResponse.ok ? "Readme Available" : null
          );
        } catch {
          return mapRepository(repo, null);
        }
      })
    );

    return Response.json({
      success: true,
      page,
      perPage,
      listingMode,
      viewer: authenticatedUsername || username || null,
      repos: reposWithReadmeFlag,
    });
  } catch (error) {
    console.error("Error fetching repositories:", error);
    return Response.json(
      { error: "Server error fetching repositories" },
      { status: 500 }
    );
  }
}
