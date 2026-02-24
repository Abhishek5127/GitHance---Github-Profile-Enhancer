"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const COMMIT_STAT_BLOCKS = [
  { id: "contribution", type: "contribution", label: "Contribution Summary" },
  { id: "streak", type: "streak", label: "Commit Streak" },
  { id: "last_repo", type: "repo", metric: "last_repo", label: "Last Worked Repo" },
  { id: "total_commits", type: "repo", metric: "total_commits", label: "Total Commits" },
  { id: "active_days", type: "repo", metric: "active_days", label: "Active Days (30/90)" },
  { id: "top_repo", type: "repo", metric: "top_repo", label: "Top Repo (Recent)" },
];

function encodeStatsSnapshot(stats) {
  try {
    const payload = {
      github_username: stats.github_username,
      total_commits: Number(stats.total_commits || 0),
      current_streak: Number(stats.current_streak || 0),
      longest_streak: Number(stats.longest_streak || 0),
      last_repo: String(stats.last_repo || ""),
      active_days_30: Number(stats.active_days_30 || 0),
      active_days_90: Number(stats.active_days_90 || 0),
      top_repo_recent: String(stats.top_repo_recent || ""),
      recent_commits_7: Number(stats.recent_commits_7 || 0),
      recent_commits_30: Number(stats.recent_commits_30 || 0),
      last_updated: String(stats.last_updated || ""),
    };

    return encodeURIComponent(JSON.stringify(payload));
  } catch {
    return "";
  }
}

function buildBlockUrl({ username, type, metric, version, snapshot }) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("user", username);

  if (metric) {
    params.set("metric", metric);
  }

  if (version) {
    params.set("v", String(version));
  }

  if (snapshot) {
    params.set("snapshot", snapshot);
  }

  return `/api/render?${params.toString()}`;
}

export default function RepoCommitStatsBlock({ item }) {
  const { data: session } = useSession();
  const username = (item?.data?.username || session?.username || "").trim();
  const token = session?.accessToken || "";
  const [bootstrapStatus, setBootstrapStatus] = useState({
    loading: false,
    error: "",
    version: 0,
    stats: null,
  });

  useEffect(() => {
    if (!username || !token) return;

    let cancelled = false;

    const bootstrapStats = async () => {
      try {
        setBootstrapStatus((prev) => ({
          ...prev,
          loading: true,
          error: "",
        }));

        const response = await fetch("/api/github/stats/bootstrap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            token,
          }),
        });

        const data = await response.json();
        if (cancelled) return;

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load commit stats");
        }

        setBootstrapStatus({
          loading: false,
          error: "",
          version: Date.now(),
          stats: data?.stats || null,
        });
      } catch (error) {
        if (cancelled) return;
        setBootstrapStatus((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || "Failed to load commit stats",
          stats: null,
        }));
      }
    };

    bootstrapStats();

    return () => {
      cancelled = true;
    };
  }, [username, token]);

  const statsBlocks = useMemo(() => {
    if (!username) return [];

    const snapshot = bootstrapStatus.stats
      ? encodeStatsSnapshot(bootstrapStatus.stats)
      : "";

    return COMMIT_STAT_BLOCKS.map((block) => ({
      ...block,
      src: buildBlockUrl({
        username,
        type: block.type,
        metric: block.metric,
        version: bootstrapStatus.version,
        snapshot,
      }),
    }));
  }, [username, bootstrapStatus.stats, bootstrapStatus.version]);

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
      {bootstrapStatus.loading ? (
        <p className="mb-2 text-xs text-cyan-200">Loading latest GitHub stats...</p>
      ) : null}
      {bootstrapStatus.error ? (
        <p className="mb-2 text-xs text-red-300">{bootstrapStatus.error}</p>
      ) : null}
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
