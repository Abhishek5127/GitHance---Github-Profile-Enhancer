import RepositorySecurityClient from "./RepositorySecurityClient";

export default async function Page({ params }) {
  const { reponame } = await params;
  return <RepositorySecurityClient reponame={reponame} />;
}
