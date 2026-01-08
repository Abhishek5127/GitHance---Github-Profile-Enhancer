export async function POST(req) {
  const {username} = await req.json();
  //const username = 'ahtisham-1214'
  if (!username) {
    return new Response("Username required", { status: 400 });
  }

  // 1️⃣ Fetch README
  const mdRes = await fetch(
    `https://raw.githubusercontent.com/${username}/${username}/HEAD/README.md`
  );

  if (!mdRes.ok) {
    return new Response("README not found", { status: 404 });
  }

  const markdown = await mdRes.text();

  // 2️⃣ Render Markdown via GitHub
  const renderRes = await fetch("https://api.github.com/markdown", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({
      text: markdown,
      mode: "gfm",
      context: `${username}/${username}`, // REQUIRED
    }),
  });

  let html = await renderRes.text();

  // 3️⃣ FIX RELATIVE IMAGE PATHS (THIS IS THE MISSING PIECE)
  const base = `https://raw.githubusercontent.com/${username}/${username}/HEAD/`;

  html = html.replace(
    /<img([^>]+)src="(?!https?:|data:)([^"]+)"/g,
    `<img$1src="${base}$2"`
  );

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
}
