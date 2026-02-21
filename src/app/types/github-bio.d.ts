export interface GitHubProfile {
  username: string;
  name: string;
  bio: string;
  location: string;
  followers: number;
  public_repos: number;
}

export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  topics: string[];
  homepage: string;
  stargazers_count: number;
  forks_count: number;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface BioStats {
  top_languages: string[];
  primary_stack: string[];
  domains: string[];
  deployed_projects: string[];
  recent_activity: string;
}

export interface BioPayload {
  profile: GitHubProfile;
  repos: GitHubRepo[];
  stats: BioStats;
}
