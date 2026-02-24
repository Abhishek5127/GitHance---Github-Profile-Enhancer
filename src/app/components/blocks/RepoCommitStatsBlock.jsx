"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";

const COMMIT_STAT_BLOCKS = [
  { id: "contribution", type: "contribution", label: "Contribution Summary" },
  { id: "streak", type: "streak", label: "Commit Streak" },
  { id: "last_repo", type: "repo", metric: "last_repo", label: "Last Worked Repo" },
  { id: "total_commits", type: "repo", metric: "total_commits", label: "Total Commits" },
  { id: "active_days", type: "repo", metric: "active_days", label: "Active Days (30/90)" },
  { id: "top_repo", type: "repo", metric: "top_repo", label: "Top Repo (Recent)" },
];

function buildBlockUrl({ username, type, metric }) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("user", username);

  if (metric) {
    params.set("metric", metric);
  }

  return `/api/render?${params.toString()}`;
}

export default function RepoCommitStatsBlock({ item }) {
  const { data: session } = useSession();
  const username = (item?.data?.username || session?.username || "").trim();

  const statsBlocks = useMemo(() => {
    if (!username) return [];

    return COMMIT_STAT_BLOCKS.map((block) => ({
      ...block,
      src: buildBlockUrl({
        username,
        type: block.type,
        metric: block.metric,
      }),
    }));
  }, [username]);

  if (!username) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4 text-sm text-white/60">
        Sign in to preview live repository commit stats.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1115] p-3">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/45">
        Repo Commit Stats
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {statsBlocks.map((block) => (
          <div key={block.id} className="rounded-lg border border-white/10 bg-[#0b0d0f] p-2">
            <p className="mb-1 text-[11px] text-white/60">{block.label}</p>
            <img
              src={block.src}
              alt={block.label}
              loading="lazy"
              className="w-full rounded-md border border-white/10 bg-[#0b0d0f]"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
