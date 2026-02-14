export async function POST(req) {
  try {
    const { username, repo, path, content, message, token } = await req.json();

    if (!token) {
      return Response.json(
        { error: "Missing GitHub access token. Please sign in again." },
        { status: 401 }
      );
    }

    if (!username || !repo || !path || !content) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Check if file exists to include sha only when updating.
    const fileRes = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const fileData = await fileRes.json();
    const sha = fileRes.ok ? fileData.sha : undefined;

    // Push updated content
    const updateRes = await fetch(
      `https://api.github.com/repos/${username}/${repo}/contents/${path}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message || "Updated via GitHub Analyzer App",
          content: Buffer.from(content).toString("base64"),
          ...(sha ? { sha } : {}),
        }),
      }
    );

    const result = await updateRes.json();
    if (!updateRes.ok) {
      return Response.json(
        { error: result?.message || "Failed to update README", details: result },
        { status: updateRes.status }
      );
    }

    return Response.json({ success: true, result });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
