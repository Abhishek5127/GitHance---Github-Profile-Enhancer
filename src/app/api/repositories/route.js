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
    readme: readmeValue,
  };
}

export async function POST(req) {
  const {
    username,
    page = 1,
    perPage = 10,
    token,
    includeReadme = true,
  } = await req.json();

  if (!username) {
    return Response.json({ error: "Username required" }, { status: 400 });
  }

  const parsedPage = clamp(toNumber(page, 1), 1, 100);
  const parsedPerPage = clamp(toNumber(perPage, 10), 1, 100);
  const shouldIncludeReadme = includeReadme !== false;

  try {
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        }
      : {
          Accept: "application/vnd.github+json",
        };

    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&page=${parsedPage}&per_page=${parsedPerPage}`,
      { headers }
    );

    if (!reposRes.ok) {
      return Response.json(
        { error: "GitHub user not found" },
        { status: reposRes.status }
      );
    }

    const repos = await reposRes.json();
    if (!Array.isArray(repos)) {
      return Response.json({ error: "Unexpected GitHub response" }, { status: 502 });
    }

    if (!shouldIncludeReadme) {
      return Response.json({
        success: true,
        page: parsedPage,
        perPage: parsedPerPage,
        repos: repos.map((repo) => mapRepository(repo)),
      });
    }

    const reposWithReadmeFlag = await Promise.all(
      repos.map(async (repo) => {
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${username}/${repo.name}/readme`,
            { headers }
          );

          return mapRepository(repo, readmeRes.ok ? "Readme Available" : null);
        } catch {
          return mapRepository(repo, null);
        }
      })
    );

    return Response.json({
      success: true,
      page: parsedPage,
      perPage: parsedPerPage,
      repos: reposWithReadmeFlag,
    });
  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Server error fetching repositories" },
      { status: 500 }
    );
  }
}
