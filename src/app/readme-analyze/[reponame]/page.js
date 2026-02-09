import ReadmeClient from "./ReadmeClient";

export default async function Page({ params }) {
  const { reponame } = await params;
  return <ReadmeClient reponame={reponame}/>;
}