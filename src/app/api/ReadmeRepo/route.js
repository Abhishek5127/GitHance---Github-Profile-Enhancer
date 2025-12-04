export async function POST(req) {
    
    const { username,repoCount } = await req.json();
    const token = process.env.GITHUB_TOKEN;


    if (!username) {
        return Response.json({ error: "Username required" }, { status: 400 });
    }

    const Authorization = `Bearer ${token}`;

    try {
        // STEP 1: Fetch all repos
        const reposRes = await fetch(
            `https://api.github.com/users/${username}/repos?per_page=${repoCount}&sort=updated`,
            { headers: { Authorization } }
        );

        if (!reposRes.ok) {
            return Response.json({ error: "GitHub user not found" }, { status: 404 });
        }

        const repos = await reposRes.json();

        // STEP 2: Loop through repos and fetch README for each
        for (const repo of repos) {
            try {
                const readmeRes = await fetch(
                    `https://api.github.com/repos/${username}/${repo.name}/readme`,
                    { headers: { Authorization } }
                );

                if (!readmeRes.ok) {
                    repo.readme = null;
                    continue; // skip repo without README
                }

                const readmeJson = await readmeRes.json();

                // decode base64 content
                const decoded = Buffer.from(
                    readmeJson.content,
                    "base64"
                ).toString("utf8");

                repo.readme = decoded;

            } catch (err) {
                // In case a repo fetch fails
                repo.readme = null;
            }
        }

        // STEP 3: Return the updated repos array
        return Response.json({
            success: true,
            repos
        });

    } catch (error) {
        console.error("Error fetching repos:", error);
        return Response.json(
            { error: "Server error fetching repositories" },
            { status: 500 }
        );
    }
}
