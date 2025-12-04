export async function POST(req) {
    const { username } = await req.json();
    const token = process.env.GITHUB_TOKEN;
    const Authorization = `Bearer ${token}`

    try {
        const reposRes = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
            { headers: { Authorization } }
        );
        const repos = await reposRes.json();
        try {
            for (const repo of repos) {
                const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, {
                    headers: { Authorization }
                });

                if (!readmeRes.ok) {
                    repo.readme = null;
                    continue;
                }

                const readmeJson = await readmeRes.json();

                const decoded = Buffer.from(readmeJson.content, "base64").toString("utf8");

                repo.readme = decoded

                
            }

            return Response.json({
                success: true,
                repos,
            });



        } catch (error) {
            return Response.json({ error: "error fetching repositries."}, {status: 404} )
        }

    } catch (error) {
        return Response.json({ error: "something went wrong"}, {status: 500 })
    }

}