import ReadmeClient from "./ReadmeClient";

export default async function Page({ params }) {
  const { reponame } = await params; // ✅ correct

  return <ReadmeClient reponame={reponame} />;
}
