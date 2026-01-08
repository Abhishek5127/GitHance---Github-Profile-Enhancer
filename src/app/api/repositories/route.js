export async function POST(req) {
  const { username, page = 1, perPage = 10 } = await req.json();
  const token = process.env.GITHUB_TOKEN;

  if (!username) {
    return Response.json(
      { error: "Username required" },
      { status: 400 }
    );
  }

  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!reposRes.ok) {
      return Response.json(
        { error: "GitHub user not found" },
        { status: reposRes.status }
      );
    }

    const repos = await reposRes.json();

    // ⚡ LIMITED README CHECK (FAST)
    const reposWithReadmeFlag = await Promise.all(
      repos.map(async (repo) => {
        try {
          const readmeRes = await fetch(
            `https://api.github.com/repos/${username}/${repo.name}/readme`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: "application/vnd.github+json",
              },
            }
          );

          return {
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description,
            html_url: repo.html_url,
            language: repo.language,
            updated_at: repo.updated_at,
            default_branch: repo.default_branch,
            owner: repo.owner.login,

            // 👇 FRONTEND-SAFE
            readme: readmeRes.ok ? "Readme Available" : null,
          };
        } catch {
          return {
            id: repo.id,
            name: repo.name,
            readme: null,
          };
        }
      })
    );

    return Response.json({
      success: true,
      page,
      perPage,
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
