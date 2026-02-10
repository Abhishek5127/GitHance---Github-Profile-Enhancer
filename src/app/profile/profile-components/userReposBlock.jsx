import React from "react";
import RepoCard from "./RepoCard";

const UserReposBlock = ({ userRepos, loading }) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Repositories</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Recent activity</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          {loading ? "Loading..." : `${userRepos?.length || 0} total`}
        </span>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-white/5" />
          ))}
        </div>
      ) : userRepos && userRepos.length > 0 ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {userRepos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1115] p-6 text-sm text-white/60">
          No repositories found.
        </div>
      )}
    </div>
  );
};

export default UserReposBlock;