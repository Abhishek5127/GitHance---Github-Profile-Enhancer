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

function StickerDropSlot({
  itemId,
  slot,
  visible,
  sizePx = 56,
  isLightTheme = false,
  offsetStyle = null,
}) {
  const dropId = buildStickerDropId(itemId, slot.id);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!visible) return null;

  const safeSize = Math.max(40, Number(sizePx) || 56);
  const idleClass = isLightTheme
    ? "border-slate-400/55 bg-white/70 text-slate-700 shadow-[0_8px_22px_rgba(15,23,42,0.14)] backdrop-blur-[1.5px]"
    : "border-cyan-200/45 bg-cyan-300/10 text-cyan-100/80";
  const activeClass = isLightTheme
    ? "border-cyan-500/70 bg-cyan-200/75 text-slate-900 shadow-[0_0_26px_rgba(56,189,248,0.35)]"
    : "border-cyan-200/90 bg-cyan-300/30 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.4)]";

  return (
    <div
      ref={setNodeRef}
      className={`pointer-events-auto absolute z-30 flex items-center justify-center border border-dashed text-[10px] font-semibold uppercase tracking-[0.08em] transition ${slot.positionClass} ${
        isOver ? activeClass : idleClass
      }`}
      style={{
        ...(offsetStyle || {}),
        width: `${safeSize}px`,
        height: `${safeSize}px`,
        borderRadius: `${Math.max(10, Math.round(safeSize * 0.2))}px`,
      }}
    >
      <div
        className={`pointer-events-none absolute inset-[3px] rounded-[inherit] border ${
          isLightTheme ? "border-slate-400/35" : "border-cyan-200/20"
        }`}
      />
      <span className="relative">{slot.shortLabel}</span>
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
  const isPlainWhiteVariant = variant === "tortoise";
  const imageWidth = isPlainWhiteVariant
    ? isMonthlyRange
      ? 560
      : 1120
    : isMonthlyRange
      ? 460
      : 780;
  const imageHeight = isPlainWhiteVariant
    ? isMonthlyRange
      ? 228
      : 320
    : isMonthlyRange
      ? 210
      : 278;
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
  const monthlyBottomNudgeStyle = { transform: "translateY(-14px)" };
  const imagePadding = isPlainWhiteVariant ? 0 : stickerPadding;
  const availableStickerSlots = useMemo(
    () =>
      isMonthlyRange
        ? STICKER_SLOT_PRESETS.filter(
            (slot) => slot.id === "bottom-left" || slot.id === "bottom-right"
          )
        : STICKER_SLOT_PRESETS,
    [isMonthlyRange]
  );

  const svgMarkup = useMemo(() => {
    return renderContributionHeatmapSvg({
      username: username || "github-user",
      days: Array.isArray(resolvedSnapshot?.days) ? resolvedSnapshot.days : [],
      variant,
      range,
      title: "Contribution Graph",
      compact: !isPlainWhiteVariant,
      width: imageWidth,
      height: imageHeight,
    });
  }, [
    imageHeight,
    imageWidth,
    isPlainWhiteVariant,
    range,
    resolvedSnapshot?.days,
    username,
    variant,
  ]);

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
      className={`w-auto min-w-0 ${
        isPlainWhiteVariant ? "" : "rounded-xl border border-white/10 bg-[#0b111c] p-3"
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        
        
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
        className={`relative overflow-hidden ${
          isPlainWhiteVariant
            ? "rounded-lg border border-slate-300/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(243,246,250,0.98))] p-0 shadow-none"
            : "rounded-lg border border-white/10 bg-[#050912] p-1"
        } ${
          isPlainWhiteVariant
            ? "mx-auto w-fit max-w-full"
            : isMonthlyRange
              ? "mx-auto w-fit"
            : "w-full max-w-[920px]"
        }`}
      >
        <div
          className="relative z-10"
          style={{
            paddingTop: `${imagePadding}px`,
            paddingBottom: `${imagePadding}px`,
            paddingLeft: `${imagePadding}px`,
            paddingRight: `${imagePadding}px`,
          }}
        >
          <Image
            src={imageSrc}
            alt="Contribution graph heatmap"
            width={imageWidth}
            height={imageHeight}
            unoptimized
            className={`block h-auto ${isPlainWhiteVariant || isMonthlyRange ? "w-auto max-w-full" : "w-full"} ${
              isPlainWhiteVariant ? "rounded-lg" : "rounded-md"
            }`}
            key={`contribution-graph-${fetchState.version}-${variant}-${range}`}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {availableStickerSlots.map((slot) => {
            const stickerId = normalizedStickers?.[slot.id];
            const sticker = getStickerById(stickerId);
            if (!sticker) return null;
            const stickerSizePx = isMonthlyRange
              ? monthlyStickerDisplayPx
              : getStickerBaseSizePx(sticker.id) * 2;
            const nudgeStyle =
              isMonthlyRange && slot.id.startsWith("bottom")
                ? monthlyBottomNudgeStyle
                : undefined;

            return (
              <div
                key={`${item.id}-${slot.id}`}
                className={`absolute ${slot.positionClass}`}
                style={nudgeStyle}
              >
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
                    className={`absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border text-[10px] opacity-0 transition group-hover/sticker:opacity-100 ${
                      isPlainWhiteVariant
                        ? "border-slate-500/55 bg-white text-slate-700 shadow-[0_8px_16px_rgba(15,23,42,0.18)]"
                        : "border-red-500/55 bg-[#0f1115] text-red-200"
                    }`}
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
            {availableStickerSlots.map((slot) => (
              <StickerDropSlot
                key={`drop-slot-${item.id}-${slot.id}`}
                itemId={item.id}
                slot={slot}
                visible
                sizePx={slotSizePx}
                isLightTheme={isPlainWhiteVariant}
                offsetStyle={
                  isMonthlyRange && slot.id.startsWith("bottom")
                    ? monthlyBottomNudgeStyle
                    : null
                }
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
