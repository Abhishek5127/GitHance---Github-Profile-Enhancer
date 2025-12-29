export async function POST(req) {
  try {
    const { username, reponame, token } = await req.json();

    // 1️⃣ Validation
    if (!username || !reponame) {
      return Response.json(
        { error: "Username and repository name are required" },
        { status: 400 }
      );
    }

    // 2️⃣ Token (prefer user token, fallback to env)
    const authToken = token || process.env.GITHUB_TOKEN;

    if (!authToken) {
      return Response.json(
        { error: "GitHub access token missing" },
        { status: 401 }
      );
    }

    const headers = {
      Authorization: `Bearer ${authToken}`,
      Accept: "application/vnd.github+json",
    };

    // 3️⃣ Fetch repo info to get default branch
    const repoInfoRes = await fetch(
      `https://api.github.com/repos/${username}/${reponame}`,
      { headers }
    );

    if (!repoInfoRes.ok) {
      return Response.json(
        { error: "Repository not found" },
        { status: repoInfoRes.status }
      );
    }

    const repoInfo = await repoInfoRes.json();
    const defaultBranch = repoInfo.default_branch;
    console.log(defaultBranch);

    // 4️⃣ Fetch full repo tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${username}/${reponame}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    );

    if (!treeRes.ok) {
      return Response.json(
        { error: "Failed to fetch repository tree" },
        { status: treeRes.status }
      );
    }

    const treeData = await treeRes.json();

    // 5️⃣ Safety guard for huge repos
    if (treeData.tree.length > 5000) {
      return Response.json(
        { error: "Repository too large to analyze" },
        { status: 413 }
      );
    }

    // 6️⃣ Normalize tree (IMPORTANT)
    const normalizedTree = treeData.tree.map((item) => ({
      path: item.path,
      type: item.type === "tree" ? "folder" : "file",
    }));

    // 7️⃣ Return clean data
    return Response.json({
      success: true,
      repo: reponame,
      branch: defaultBranch,
      tree: normalizedTree,
    });
   
  } catch (error) {
    console.error("Repo tree error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
