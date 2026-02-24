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

function buildBlockUrl({ username, installationId, type, metric, version }) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("user", username);

  if (installationId) {
    params.set("installation_id", String(installationId));
  }

  if (metric) {
    params.set("metric", metric);
  }

  if (version) {
    params.set("v", String(version));
  }

  return `/api/render?${params.toString()}`;
}

export default function RepoCommitStatsBlock({ item, setItems }) {
  const { data: session } = useSession();
  const username = (item?.data?.username || session?.username || "").trim();
  const token = session?.accessToken || "";
  const requestedInstallationId = Number(item?.data?.installationId || 0) || null;
  const persistedSnapshot = item?.data?.statsSnapshot || null;
  const [bootstrapStatus, setBootstrapStatus] = useState({
    loading: false,
    error: "",
    version: 0,
    stats: persistedSnapshot,
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
            installationId: requestedInstallationId,
            force: false,
          }),
        });

        const data = await response.json();
        if (cancelled) return;

        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || "Failed to load commit stats");
        }

        const nextSnapshot = data?.stats || null;
        setBootstrapStatus({
          loading: false,
          error: "",
          version: Date.now(),
          stats: nextSnapshot,
        });

        if (
          typeof setItems === "function" &&
          item?.id &&
          nextSnapshot
        ) {
          const serialized = JSON.stringify(nextSnapshot);
          const nextInstallationId =
            Number(nextSnapshot?.installation_id || 0) || null;

          setItems((prev) => {
            let changed = false;
            const nextItems = prev.map((entry) => {
              if (entry.id !== item.id) return entry;

              const existingSerialized = JSON.stringify(
                entry?.data?.statsSnapshot || null
              );
              const existingInstallationId =
                Number(entry?.data?.installationId || 0) || null;

              if (
                existingSerialized === serialized &&
                existingInstallationId === nextInstallationId &&
                String(entry?.data?.username || "") === username
              ) {
                return entry;
              }

              changed = true;
              return {
                ...entry,
                data: {
                  ...entry.data,
                  username,
                  statsSnapshot: nextSnapshot,
                  installationId: nextInstallationId,
                },
              };
            });

            return changed ? nextItems : prev;
          });
        }
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
  }, [item?.id, requestedInstallationId, setItems, token, username]);

  const statsBlocks = useMemo(() => {
    if (!username) return [];
    const resolvedInstallationId =
      Number(requestedInstallationId || bootstrapStatus?.stats?.installation_id || 0) ||
      null;

    return COMMIT_STAT_BLOCKS.map((block) => ({
      ...block,
      src: buildBlockUrl({
        username,
        installationId: resolvedInstallationId,
        type: block.type,
        metric: block.metric,
        version: bootstrapStatus.version,
      }),
    }));
  }, [bootstrapStatus.stats?.installation_id, bootstrapStatus.version, requestedInstallationId, username]);

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
