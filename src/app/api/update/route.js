export async function POST(req) {
  try {
    const { username, repo, path, content, message,token } = await req.json();

    //const token = process.env.GITHUB_TOKEN;

    if (!username || !repo || !path || !content) {
      return Response.json({ error: "Missing parameters" }, { status: 400 });
    }

    // Check if the file exists to get SHA
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

    const sha = fileData.sha; // required for updating

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
          sha,
        }),
      }
    );

    const result = await updateRes.json();

    return Response.json({ success: true, result });

  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
