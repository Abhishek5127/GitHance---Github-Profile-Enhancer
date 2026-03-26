"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useDroppable } from "@dnd-kit/core";
import SafeImage from "@/app/components/seo/SafeImage";
import {
  REPO_COMMIT_STAT_ITEMS,
  getRepoCommitStatItemById,
} from "@/app/lib/repoCommitCatalog";
import { resolveProfileBuilderUsername } from "@/app/lib/profileComponents";
import {
  STICKER_SLOT_PRESETS,
  buildStickerDropId,
  getMaxStickerBaseSizePx,
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

const COMPACT_CANVAS_WIDTH = 420;
const COMPACT_CANVAS_HEIGHT_TALL = 176;
const COMPACT_CANVAS_HEIGHT_REPO = 154;

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

function StickerDropSlot({ itemId, slot, visible, sizePx = 56 }) {
  const dropId = buildStickerDropId(itemId, slot.id);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!visible) return null;

  const safeSize = Math.max(38, Number(sizePx) || 56);

  return (
    <div
      ref={setNodeRef}
      className={`pointer-events-auto absolute z-30 flex items-center justify-center border border-dashed text-[10px] font-semibold uppercase tracking-[0.08em] transition ${slot.positionClass} ${
        isOver
          ? "border-cyan-200/90 bg-cyan-300/30 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.4)]"
          : "border-cyan-200/45 bg-cyan-300/10 text-cyan-100/80"
      }`}
      style={{
        width: `${safeSize}px`,
        height: `${safeSize}px`,
        borderRadius: `${Math.max(10, Math.round(safeSize * 0.2))}px`,
      }}
    >
      {slot.shortLabel}
    </div>
  );
}

export default function RepoCommitStatsBlock({
  item,
  setItems,
  stickerAssignments = {},
  showStickerDropSlots = false,
}) {
  const { data: session } = useSession();
  const username = resolveProfileBuilderUsername(
    item?.data?.username,
    session?.username
  );
  const token = session?.accessToken || "";
  const requestedInstallationId = Number(item?.data?.installationId || 0) || null;
  const persistedSnapshot = item?.data?.statsSnapshot || null;
  const hasPersistedSnapshot = Boolean(
    persistedSnapshot && typeof persistedSnapshot === "object"
  );
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
  const normalizedStickers = useMemo(
    () => normalizeStickerAssignments(stickerAssignments),
    [stickerAssignments]
  );
  const stickerBaseMax = useMemo(() => getMaxStickerBaseSizePx(), []);
  const stickerDisplayMax = stickerBaseMax * 2;
  const stickerPadding = Math.max(20, Math.round(stickerDisplayMax * 0.5));
  const slotSizePx = Math.max(56, Math.round(stickerDisplayMax * 0.52));

  const handleRemoveSticker = (slotId) => {
    if (!slotId || typeof setItems !== "function") return;

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) return entry;

        const currentStickers = normalizeStickerAssignments(entry?.data?.stickers);
        if (!currentStickers?.[slotId]) return entry;

        const nextStickers = { ...currentStickers };
        delete nextStickers[slotId];

        return {
          ...entry,
          data: {
            ...entry.data,
            stickers: nextStickers,
          },
        };
      })
    );
  };

  if (!username) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4 text-sm text-white/60">
        Sign in to preview live repository commit stats.
      </div>
    );
  }

  const cardClass = "rounded-lg p-1.5";
  const labelClass = "mb-1 text-[10px] text-cyan-100/80";

  return (
    <div className="w-full min-w-0">
      {bootstrapStatus.loading ? (
        <p className="mb-2 text-xs text-cyan-200">Loading latest GitHub stats...</p>
      ) : null}
      {bootstrapStatus.error ? (
        <p className="mb-2 text-xs text-red-300">{bootstrapStatus.error}</p>
      ) : null}

      <div className="relative mx-auto w-full max-w-[560px]">
        <div
          className="relative z-10"
          style={{ padding: `${stickerPadding}px` }}
        >
          {statsBlocks.length === 1 ? (
            <div className={`${cardClass} w-full min-w-0`}>
              <SafeImage
                src={statsBlocks[0].src}
                alt={statsBlocks[0].label}
                width={COMPACT_CANVAS_WIDTH}
                height={COMPACT_CANVAS_HEIGHT_TALL}
                className="mx-auto block h-auto max-w-full rounded-md border border-white/10 bg-[#0f0b0b]"
                sizes="(min-width: 640px) 420px, 100vw"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1.5">
              {statsBlocks.map((block) => (
                <div key={block.id} className={`${cardClass} w-full min-w-0`}>
                  <p className={labelClass}>{block.label}</p>
                  <SafeImage
                    src={block.src}
                    alt={block.label}
                    width={COMPACT_CANVAS_WIDTH}
                    height={COMPACT_CANVAS_HEIGHT_TALL}
                    className="mx-auto block h-auto max-w-full rounded-md border border-white/10 bg-[#0b0d0f]"
                    sizes="(min-width: 640px) 420px, 100vw"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {STICKER_SLOT_PRESETS.map((slot) => {
            const stickerId = normalizedStickers?.[slot.id];
            const sticker = getStickerById(stickerId);
            if (!sticker) return null;

            const stickerSizePx = getStickerBaseSizePx(sticker.id) * 2;

            return (
              <div key={`${item.id}-${slot.id}`} className={`absolute ${slot.positionClass}`}>
                <div className="group/sticker relative pointer-events-auto">
                  <SafeImage
                    src={sticker.assetPath}
                    alt={sticker.title}
                    width={stickerSizePx}
                    height={stickerSizePx}
                    className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                    style={{
                      width: `${stickerSizePx}px`,
                      height: `${stickerSizePx}px`,
                    }}
                    sizes={`${stickerSizePx}px`}
                  />
                  <button
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      handleRemoveSticker(slot.id);
                    }}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-red-500/55 bg-[#0f1115] text-[10px] text-red-200 opacity-0 transition group-hover/sticker:opacity-100"
                    title="Remove sticker"
                    aria-label="Remove sticker"
                  >
                    x
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {showStickerDropSlots ? (
          <div className="pointer-events-none absolute inset-0 z-30">
            {STICKER_SLOT_PRESETS.map((slot) => (
              <StickerDropSlot
                key={`drop-slot-${item.id}-${slot.id}`}
                itemId={item.id}
                slot={slot}
                visible
                sizePx={slotSizePx}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}



