export async function POST(req) {
  const { username, page = 1, perPage = 10 } = await req.json();
  const token = process.env.GITHUB_TOKEN;

  if (!username) {
    return Response.json({ error: "Username required" }, { status: 400 });
  }

  const Authorization = `Bearer ${token}`;

  try {
    // Fetch paginated repos
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?&sort=updated`,
      { headers: { Authorization } }
    );

    if (!reposRes.ok) {
      return Response.json(
        { error: "GitHub user not found" },
        { status: 404 }
      );
    }

    const repos = await reposRes.json();

    // Fetch README for each repo
    for (const repo of repos) {
      try {
        const readmeRes = await fetch(
          `https://api.github.com/repos/${username}/${repo.name}/readme`,
          { headers: { Authorization } }
        );

        if (!readmeRes.ok) {
          repo.readme = null;
          continue;
        }

        const readmeJson = await readmeRes.json();
        const decoded = Buffer.from(
          readmeJson.content,
          "base64"
        ).toString("utf8");

        repo.readme = decoded;
      } catch (err) {
        repo.readme = null;
      }
    }

    return Response.json({
      success: true,
      repos,
    });

  } catch (error) {
    console.error("Error:", error);
    return Response.json(
      { error: "Server error fetching repositories" },
      { status: 500 }
    );
  }
}
