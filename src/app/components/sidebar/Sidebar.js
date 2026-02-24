"use client";

import { useMemo } from "react";
import { useSession } from "next-auth/react";
import TemplateItem from "./TemplateItem";
import { PROFILE_TEMPLATES } from "../../lib/profileTemplates";

const COMMIT_STAT_BLOCKS = [
  { id: "contribution", type: "contribution", label: "Contribution Summary" },
  { id: "streak", type: "streak", label: "Commit Streak" },
  { id: "last-repo", type: "repo", metric: "last_repo", label: "Last Worked Repo" },
  { id: "total-commits", type: "repo", metric: "total_commits", label: "Total Commits" },
  { id: "active-days", type: "repo", metric: "active_days", label: "Active Days (30/90)" },
  { id: "top-repo", type: "repo", metric: "top_repo", label: "Top Repo (Recent)" },
];

function buildRenderUrl({ username, type, metric }) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("user", username);

  if (metric) {
    params.set("metric", metric);
  }

  return `/api/render?${params.toString()}`;
}

export default function Sidebar({ onSelectBlock }) {
  const { data: session } = useSession();
  const username = session?.username || "";

  const commitBlocks = useMemo(() => {
    if (!username) return [];

    return COMMIT_STAT_BLOCKS.map((block) => ({
      ...block,
      src: buildRenderUrl({
        username,
        type: block.type,
        metric: block.metric,
      }),
    }));
  }, [username]);

  return (
    <aside className="w-72 border-r border-white/10 bg-[#0d1117] p-4 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Blocks</p>
        <h3 className="mt-2 text-lg font-semibold">Components</h3>
      </div>

      <div className="mt-4 space-y-2">
        {PROFILE_TEMPLATES.map((t) => (
          <TemplateItem
            key={t.id}
            template={t}
            onSelect={onSelectBlock}
          />
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
        Click a component to choose its style and customize it.
      </p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-3" id="repo-commit">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Repo Commit</p>
        <h4 className="mt-2 text-sm font-semibold text-white">Live GitHub Stats</h4>

        {!username ? (
          <p className="mt-3 text-xs text-white/60">
            Sign in to load dynamic contribution and commit stats blocks.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {commitBlocks.map((block) => (
              <div key={block.id} className="rounded-xl border border-white/10 bg-[#0b0d0f] p-2">
                <p className="mb-1 text-[11px] text-white/60">{block.label}</p>
                <img
                  src={block.src}
                  alt={block.label}
                  loading="lazy"
                  className="w-full rounded-lg border border-white/10 bg-[#0b0d0f]"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
