import { NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

export async function POST(req) {
  const { owner, repo, svgContent, readmeContent } = await req.json();

  const headers = {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
  };

  /* ---------- 1. Upload SVG ---------- */
  const svgPath = "assets/headers/header.svg";
  const svgBase64 = Buffer.from(svgContent).toString("base64");

  const existingSvg = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${svgPath}`,
    { headers }
  );

  const svgSha = existingSvg.ok
    ? (await existingSvg.json()).sha
    : undefined;

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${svgPath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Add profile header SVG",
      content: svgBase64,
      sha: svgSha,
    }),
  });

  /* ---------- 2. Upload README ---------- */
  const readmePath = "README.md";
  const readmeBase64 = Buffer.from(readmeContent).toString("base64");

  const existingReadme = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${readmePath}`,
    { headers }
  );

  const readmeSha = existingReadme.ok
    ? (await existingReadme.json()).sha
    : undefined;

  await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${readmePath}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: "Update README via GitHance",
      content: readmeBase64,
      sha: readmeSha,
    }),
  });

  return NextResponse.json({ success: true });
}
