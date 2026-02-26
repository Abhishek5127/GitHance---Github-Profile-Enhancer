"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  REPO_COMMIT_STAT_ITEMS,
  getRepoCommitStatItemById,
} from "@/app/lib/repoCommitCatalog";

const COMPACT_CANVAS_WIDTH = 420;
const COMPACT_CANVAS_HEIGHT_TALL = 148;
const COMPACT_CANVAS_HEIGHT_REPO = 132;

function encodeStatsSnapshot(stats) {
  if (!stats || typeof stats !== "object") return "";

  try {
    const payload = {
      github_username: String(stats.github_username || ""),
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
      installation_id: Number(stats.installation_id || 0) || null,
    };

    return encodeURIComponent(JSON.stringify(payload));
  } catch {
    return "";
  }
}

function buildBlockUrl({
  username,
  installationId,
  type,
  metric,
  width,
  height,
  version,
  snapshot,
  preferSnapshot = false,
}) {
  const params = new URLSearchParams();
  params.set("type", type);
  params.set("user", username);

  if (installationId) {
    params.set("installation_id", String(installationId));
  }

  if (metric) {
    params.set("metric", metric);
  }

  if (width) {
    params.set("w", String(width));
  }

  if (height) {
    params.set("h", String(height));
  }

  if (version) {
    params.set("v", String(version));
  }

  if (snapshot) {
    params.set("snapshot", snapshot);
  }

  if (preferSnapshot && snapshot) {
    params.set("prefer_snapshot", "1");
  }

  return `/api/render?${params.toString()}`;
}

function resolveRequestedStatIds(item) {
  if (item?.type === "commitStat") {
    return [String(item?.data?.statId || "contribution").trim().toLowerCase()];
  }

  // Legacy combined block support.
  return REPO_COMMIT_STAT_ITEMS.map((entry) => entry.id);
}

export default function RepoCommitStatsBlock({ item, setItems }) {
  const { data: session } = useSession();
  const username = (item?.data?.username || session?.username || "").trim();
  const token = session?.accessToken || "";
  const requestedInstallationId = Number(item?.data?.installationId || 0) || null;
  const persistedSnapshot = item?.data?.statsSnapshot || null;
  const hasPersistedSnapshot = Boolean(
    persistedSnapshot && typeof persistedSnapshot === "object"
  );
  const selectedTheme = String(item?.data?.theme || "neon")
    .trim()
    .toLowerCase();
  const requestedStatIds = useMemo(
    () => resolveRequestedStatIds(item),
    [item]
  );

  const [bootstrapStatus, setBootstrapStatus] = useState({
    loading: false,
    error: "",
    version: 0,
    stats: persistedSnapshot,
  });

  useEffect(() => {
    if (!username || !token || hasPersistedSnapshot) return;

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
            force: true,
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
  }, [hasPersistedSnapshot, item?.id, requestedInstallationId, setItems, token, username]);

  const statsBlocks = useMemo(() => {
    if (!username) return [];
    const encodedSnapshot = encodeStatsSnapshot(
      bootstrapStatus.stats || persistedSnapshot
    );
    const resolvedInstallationId =
      Number(requestedInstallationId || bootstrapStatus?.stats?.installation_id || 0) ||
      null;

    return requestedStatIds.map((statId) => {
      const block = getRepoCommitStatItemById(statId);
      const blockHeight =
        block.type === "repo"
          ? COMPACT_CANVAS_HEIGHT_REPO
          : COMPACT_CANVAS_HEIGHT_TALL;
      return {
        ...block,
        src: buildBlockUrl({
          username,
          installationId: resolvedInstallationId,
          type: block.type,
          metric: block.metric,
          width: COMPACT_CANVAS_WIDTH,
          height: blockHeight,
          version: bootstrapStatus.version,
          snapshot: encodedSnapshot,
          preferSnapshot: true,
        }),
      };
    });
  }, [
    bootstrapStatus.stats,
    bootstrapStatus.version,
    persistedSnapshot,
    requestedInstallationId,
    requestedStatIds,
    username,
  ]);

  if (!username) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4 text-sm text-white/60">
        Sign in to preview live repository commit stats.
      </div>
    );
  }

  const isNeonTheme = selectedTheme === "neon";

  const cardClass = isNeonTheme
    ? "rounded-lg p-1.5 "
    : "rounded-lg p-1.5";
  const labelClass = isNeonTheme
    ? "mb-1 text-[10px] text-cyan-100/80"
    : "mb-1 text-[10px] text-white/60";
  const titleClass = isNeonTheme
    ? "mb-2 text-[11px] uppercase tracking-[0.18em] text-cyan-200/65"
    : "mb-2 text-[11px] uppercase tracking-[0.18em] text-white/45";

  return (
    <div className="w-full min-w-0">
      {bootstrapStatus.loading ? (
        <p className="mb-2 text-xs text-cyan-200">Loading latest GitHub stats...</p>
      ) : null}
      {bootstrapStatus.error ? (
        <p className="mb-2 text-xs text-red-300">{bootstrapStatus.error}</p>
      ) : null}
      {statsBlocks.length === 1 ? (
        <div className={`${cardClass} w-full min-w-0`}>
          <img
            src={statsBlocks[0].src}
            alt={statsBlocks[0].label}
            className="block h-auto w-full max-w-full rounded-md border border-white/10 bg-[#0f0b0b]"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5">
          {statsBlocks.map((block) => (
            <div key={block.id} className={`${cardClass} w-full min-w-0`}>
              <p className={labelClass}>{block.label}</p>
              <img
                src={block.src}
                alt={block.label}
                className="block h-auto w-full max-w-full rounded-md border border-white/10 bg-[#0b0d0f]"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
