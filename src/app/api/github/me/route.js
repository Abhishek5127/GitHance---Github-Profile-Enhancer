export async function POST(req) {
  try {
    const { token } = await req.json();

    if (!token) {
      return Response.json({ error: "Missing token" }, { status: 400 });
    }

    const res = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { error: data?.message || "Failed to fetch authenticated GitHub user" },
        { status: res.status }
      );
    }

    return Response.json({
      success: true,
      username: data?.login || "",
      profile: data,
    });
  } catch (error) {
    return Response.json(
      { error: error?.message || "Failed to fetch authenticated GitHub user" },
      { status: 500 }
    );
  }
}
