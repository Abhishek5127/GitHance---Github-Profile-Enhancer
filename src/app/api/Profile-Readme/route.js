export async function POST(req) {
  const username = 'harfool';

  if (!username) {
    return Response.json(
      { error: "Username is required" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://raw.githubusercontent.com/${username}/${username}/main/README.md`
    );

    if (!res.ok) {
      return Response.json(
        { error: "Profile README not found" },
        { status: res.status }
      );
    }

    const readme = await res.text();

    return Response.json({
      username,
      readme,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to fetch README" },
      { status: 500 }
    );
  }
}
