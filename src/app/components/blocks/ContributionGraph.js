"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import {
  normalizeContributionRange,
  normalizeContributionVariant,
  renderContributionHeatmapSvg,
} from "@/app/lib/renderers/contributionHeatmapSvg";

function hasSnapshotData(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      Array.isArray(snapshot.days) &&
      snapshot.days.length
  );
}

export default function ContributionGraph({ item, setItems }) {
  const { data: session } = useSession();
  const username = String(item?.data?.username || session?.username || "")
    .trim()
    .toLowerCase();
  const variant = normalizeContributionVariant(item?.data?.variant);
  const range = normalizeContributionRange(item?.data?.range);
  const persistedSnapshot = item?.data?.contributionSnapshot || null;
  const [fetchState, setFetchState] = useState({
    loading: false,
    error: "",
    snapshot: persistedSnapshot,
    version: 0,
  });

  const resolvedSnapshot = fetchState.snapshot || persistedSnapshot || null;
  const hasResolvedSnapshot = hasSnapshotData(resolvedSnapshot);

  useEffect(() => {
    if (hasSnapshotData(persistedSnapshot)) {
      setFetchState((prev) => ({
        ...prev,
        snapshot: persistedSnapshot,
      }));
    }
  }, [persistedSnapshot]);

  useEffect(() => {
    if (!username || hasResolvedSnapshot) return;

    let cancelled = false;

    const loadContributionSnapshot = async () => {
      try {
        setFetchState((prev) => ({
          ...prev,
          loading: true,
          error: "",
        }));

        const response = await fetch("/api/github/contributions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load contribution data");
        }

        const nextSnapshot = {
          username: String(payload?.username || username).trim().toLowerCase(),
          totalContributions: Number(payload?.totalContributions || 0),
          days: Array.isArray(payload?.days) ? payload.days : [],
          fetchedAt: String(payload?.fetchedAt || new Date().toISOString()),
        };

        if (cancelled) return;

        setFetchState({
          loading: false,
          error: "",
          snapshot: nextSnapshot,
          version: Date.now(),
        });

        if (typeof setItems === "function" && item?.id) {
          const serializedNext = JSON.stringify(nextSnapshot);
          setItems((prev) => {
            let changed = false;
            const nextItems = prev.map((entry) => {
              if (entry.id !== item.id) return entry;

              const existingSnapshot = entry?.data?.contributionSnapshot || null;
              const serializedExisting = JSON.stringify(existingSnapshot);
              const existingVariant = normalizeContributionVariant(entry?.data?.variant);
              const existingRange = normalizeContributionRange(entry?.data?.range);
              const existingUsername = String(entry?.data?.username || "").trim().toLowerCase();

              if (
                serializedExisting === serializedNext &&
                existingUsername === username &&
                existingVariant === variant &&
                existingRange === range
              ) {
                return entry;
              }

              changed = true;
              return {
                ...entry,
                data: {
                  ...entry.data,
                  username,
                  variant,
                  range,
                  contributionSnapshot: nextSnapshot,
                },
              };
            });

            return changed ? nextItems : prev;
          });
        }
      } catch (error) {
        if (cancelled) return;
        setFetchState((prev) => ({
          ...prev,
          loading: false,
          error: error?.message || "Failed to load contribution data",
        }));
      }
    };

    loadContributionSnapshot();

    return () => {
      cancelled = true;
    };
  }, [hasResolvedSnapshot, item?.id, range, setItems, username, variant]);

  const svgMarkup = useMemo(() => {
    return renderContributionHeatmapSvg({
      username: username || "github-user",
      days: Array.isArray(resolvedSnapshot?.days) ? resolvedSnapshot.days : [],
      variant,
      range,
      title: "Contribution Graph",
      compact: true,
      height: 220,
    });
  }, [range, resolvedSnapshot?.days, username, variant]);

  const imageSrc = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup]
  );

  return (
    <div className="w-full min-w-0 rounded-xl border border-white/10 bg-[#0b111c] p-3">
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">Contribution Graph</h4>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full border border-cyan-300/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-cyan-100/85">
            {variant}
          </span>
          <span className="rounded-full border border-cyan-300/25 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-cyan-100/75">
            {range}
          </span>
        </div>
      </div>

      {fetchState.loading ? (
        <p className="mb-2 text-xs text-cyan-200">Loading contribution activity...</p>
      ) : null}
      {fetchState.error ? (
        <p className="mb-2 text-xs text-red-300">{fetchState.error}</p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-white/10 bg-[#050912] p-1">
        <Image
          src={imageSrc}
          alt="Contribution graph heatmap"
          width={900}
          height={220}
          unoptimized
          className="block h-auto w-full rounded-md"
          key={`contribution-graph-${fetchState.version}-${variant}-${range}`}
        />
      </div>
    </div>
  );
}
