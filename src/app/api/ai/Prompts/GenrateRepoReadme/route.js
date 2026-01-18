export function GenrateRepoReadme({ owner, repo, branch, repoTreeCompressed, repoInfo }) {
  return `
You are an expert technical writer and senior software engineer.

Generate a HIGH-QUALITY GitHub README.md for this repository.

## Repository Info
- Owner: ${owner}
- Repo: ${repo}
- Branch: ${branch}
- Description: ${repoInfo?.description || "N/A"}
- Topics: ${(repoInfo?.topics || []).join(", ") || "N/A"}

## File Structure (compressed)
${repoTreeCompressed.map((p) => `- ${p}`).join("\n")}

## Requirements
- Must be clean markdown.
- Must include: Project Overview, Features, Tech Stack, Installation, Usage, Configuration, Folder Structure, Roadmap, Contributing, License.
- If it looks like Next.js: include scripts like dev/build/start.
- Make it match the repo. DO NOT invent fake features.
- Keep it modern & startup-style.
`;
}