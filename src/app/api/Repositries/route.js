export async function POST(req) {
    const token = process.env.GITHUB_TOKEN;
    const Authorization = `Bearer ${token}`;

    try {
        const { username } = await req.json();

        if (!username) {
            return Response.json({ error: "No Username Provided" }, { status: 400 })
        }

        const res = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
            { headers: { Authorization } }
        );
        if (!res.ok) {
            return Response.json({ error: "User not found" }, { status: 404 })
        }

        const data = await res.json();

        return Response.json({
            success: true,
            repos: data,
        });


    } catch (error) {
        return Response.json({ error: "Something went wrong" }, { status: 500 });
    }

}