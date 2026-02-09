"use client";
import React from "react";
import { useRouter } from "next/navigation";

const RepoCard = ({ repo }) => {
  const router = useRouter();

  const onRepoClick = (reponame) => {
    router.push(`/readme-analyze/${reponame}`);
  };

  return (
    <button
      type="button"
      onClick={() => onRepoClick(repo.name)}
      className="group flex h-full flex-col rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-left text-white/80 transition hover:-translate-y-1 hover:border-white/20"
    >
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-white/40">
        <span>Repository</span>
        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
          {repo.private ? "Private" : "Public"}
        </span>
      </div>

      <h3 className="mt-3 text-lg font-semibold text-white">
        {repo.name}
      </h3>

      <p className="mt-2 text-sm text-white/60">
        {repo.description || "No description provided."}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {repo.language || "Unknown"}
        </span>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
          {repo.readme || "No README"}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-white/50">
        <span>Updated</span>
        <span>{repo.updated_at ? new Date(repo.updated_at).toLocaleDateString() : "--"}</span>
      </div>
    </button>
  );
};

export default RepoCard;