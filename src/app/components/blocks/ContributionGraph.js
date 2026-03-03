"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useDroppable } from "@dnd-kit/core";
import Image from "next/image";
import {
  normalizeContributionRange,
  normalizeContributionVariant,
  renderContributionHeatmapSvg,
} from "@/app/lib/renderers/contributionHeatmapSvg";
import {
  STICKER_SLOT_PRESETS,
  buildStickerDropId,
  getMaxStickerBaseSizePx,
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

function hasSnapshotData(snapshot) {
  return Boolean(
    snapshot &&
      typeof snapshot === "object" &&
      Array.isArray(snapshot.days) &&
      snapshot.days.length
  );
}

function isSnapshotFresh(snapshot, maxAgeMs = 2 * 60 * 60 * 1000) {
  if (!hasSnapshotData(snapshot)) return false;
  const fetchedAt = new Date(String(snapshot?.fetchedAt || ""));
  if (Number.isNaN(fetchedAt.getTime())) return false;
  return Date.now() - fetchedAt.getTime() <= maxAgeMs;
}

function StickerDropSlot({ itemId, slot, visible, sizePx = 56 }) {
  const dropId = buildStickerDropId(itemId, slot.id);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!visible) return null;

  const safeSize = Math.max(40, Number(sizePx) || 56);

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

export default function ContributionGraph({
  item,
  setItems,
  stickerAssignments = {},
  showStickerDropSlots = false,
}) {
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
  const shouldRefreshSnapshot = !hasResolvedSnapshot || !isSnapshotFresh(resolvedSnapshot);
  const normalizedStickers = useMemo(
    () => normalizeStickerAssignments(stickerAssignments),
    [stickerAssignments]
  );

  useEffect(() => {
    if (hasSnapshotData(persistedSnapshot)) {
      setFetchState((prev) => ({
        ...prev,
        snapshot: persistedSnapshot,
      }));
    }
  }, [persistedSnapshot]);

  useEffect(() => {
    if (!username || !shouldRefreshSnapshot) return;

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
  }, [item?.id, range, setItems, shouldRefreshSnapshot, username, variant]);

  const isMonthlyRange = range === "monthly";
  const imageWidth = isMonthlyRange ? 460 : 780;
  const imageHeight = isMonthlyRange ? 210 : 278;
  const isPlainWhiteVariant = variant === "tortoise";
  const maxStickerDisplayPx = useMemo(() => getMaxStickerBaseSizePx() * 2, []);
  const monthlyStickerDisplayPx = Math.max(
    100,
    Math.min(imageHeight - 24, 170)
  );
  const stickerDisplayMax = isMonthlyRange ? monthlyStickerDisplayPx : maxStickerDisplayPx;
  const stickerPadding = isMonthlyRange
    ? Math.max(24, Math.round(stickerDisplayMax * 0.5))
    : Math.max(20, Math.round(stickerDisplayMax * 0.44));
  const slotSizePx = isMonthlyRange
    ? Math.max(70, Math.round(stickerDisplayMax * 0.58))
    : Math.max(56, Math.round(stickerDisplayMax * 0.52));

  const svgMarkup = useMemo(() => {
    return renderContributionHeatmapSvg({
      username: username || "github-user",
      days: Array.isArray(resolvedSnapshot?.days) ? resolvedSnapshot.days : [],
      variant,
      range,
      title: "Contribution Graph",
      compact: true,
      width: imageWidth,
      height: imageHeight,
    });
  }, [imageHeight, imageWidth, range, resolvedSnapshot?.days, username, variant]);

  const imageSrc = useMemo(
    () => `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`,
    [svgMarkup]
  );

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

  return (
    <div
      className={`w-full min-w-0 rounded-xl border p-3 ${
        isPlainWhiteVariant
          ? "border-slate-300/65 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(243,246,250,0.98))]"
          : "border-white/10 bg-[#0b111c]"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4
          className={`text-sm font-semibold ${
            isPlainWhiteVariant ? "text-slate-800" : "text-white"
          }`}
        >
          Contribution Graph
        </h4>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
              isPlainWhiteVariant
                ? "border-slate-400/65 text-slate-700"
                : "border-cyan-300/35 text-cyan-100/85"
            }`}
          >
            {variant}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
              isPlainWhiteVariant
                ? "border-slate-400/60 text-slate-700"
                : "border-cyan-300/25 text-cyan-100/75"
            }`}
          >
            {range}
          </span>
        </div>
      </div>

      {fetchState.loading ? (
        <p className={`mb-2 text-xs ${isPlainWhiteVariant ? "text-slate-600" : "text-cyan-200"}`}>
          Loading contribution activity...
        </p>
      ) : null}
      {fetchState.error ? (
        <p className="mb-2 text-xs text-red-300">{fetchState.error}</p>
      ) : null}

      <div
        className={`relative overflow-hidden rounded-lg border p-1 ${
          isPlainWhiteVariant
            ? "border-slate-300/60 bg-white"
            : "border-white/10 bg-[#050912]"
        } ${
          isMonthlyRange ? "mx-auto w-fit" : "w-full max-w-[920px]"
        }`}
      >
        <div
          className="relative z-10"
          style={{ padding: `${stickerPadding}px` }}
        >
          <Image
            src={imageSrc}
            alt="Contribution graph heatmap"
            width={imageWidth}
            height={imageHeight}
            unoptimized
            className={`block h-auto rounded-md ${isMonthlyRange ? "w-auto max-w-full" : "w-full"}`}
            key={`contribution-graph-${fetchState.version}-${variant}-${range}`}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {STICKER_SLOT_PRESETS.map((slot) => {
            const stickerId = normalizedStickers?.[slot.id];
            const sticker = getStickerById(stickerId);
            if (!sticker) return null;
            const stickerSizePx = isMonthlyRange
              ? monthlyStickerDisplayPx
              : getStickerBaseSizePx(sticker.id) * 2;

            return (
              <div key={`${item.id}-${slot.id}`} className={`absolute ${slot.positionClass}`}>
                <div className="group/sticker relative pointer-events-auto">
                  <img
                    src={sticker.assetPath}
                    alt={sticker.title}
                    className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                    style={{
                      width: `${stickerSizePx}px`,
                      height: `${stickerSizePx}px`,
                    }}
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
