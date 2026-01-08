export async function POST(req) {
  try {
    const { username } = await req.json();

    if (!username) {
      return Response.json({ error: "No username provided" }, { status: 400 });
    }

    // Fetch user info from GitHub API
    const res = await fetch(`https://api.github.com/users/${username}`);

    if (!res.ok) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const data = await res.json();

    return Response.json({
      success: true,
      profile: data,
    });

  } catch (error) {
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
