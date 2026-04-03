"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import Image from "next/image";
import SafeImage from "@/app/components/seo/SafeImage";
import { resolveProfileBuilderUsername } from "@/app/lib/profileComponents";
import {
  normalizeContributionRange,
  normalizeContributionVariant,
  renderContributionHeatmapSvg,
} from "@/app/lib/renderers/contributionHeatmapSvg";
import {
  STICKER_SLOT_PRESETS,
  buildStickerSurfaceDropId,
  getMaxStickerBaseSizePx,
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerAssignments,
  normalizeStickerLayers,
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

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  if (numeric <= 0) return 0;
  if (numeric >= 1) return 1;
  return numeric;
}

export default function ContributionGraph({
  item,
  setItems,
  stickerAssignments = {},
  showStickerDropSlots = false,
  defaultUsername = "",
}) {
  const username = resolveProfileBuilderUsername(
    defaultUsername,
    item?.data?.username
  );
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
  const stickerLayers = useMemo(
    () => normalizeStickerLayers(item?.data?.stickerLayers),
    [item?.data?.stickerLayers]
  );
  const hasStickerLayers = stickerLayers.length > 0;
  const [selectedLayerId, setSelectedLayerId] = useState("");
  const imageFrameRef = useRef(null);
  const interactionRef = useRef(null);
  const surfaceDropId = useMemo(
    () => buildStickerSurfaceDropId(item?.id),
    [item?.id]
  );
  const {
    setNodeRef: setSurfaceDropRef,
    isOver: isSurfaceDropOver,
  } = useDroppable({ id: surfaceDropId });

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
  const showLegacySlotStickers = !hasStickerLayers;

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

  useEffect(() => {
    if (!selectedLayerId) return;
    if (stickerLayers.some((layer) => layer.id === selectedLayerId)) return;
    setSelectedLayerId("");
  }, [selectedLayerId, stickerLayers]);

  function updateStickerLayers(updater) {
    if (typeof setItems !== "function" || !item?.id || typeof updater !== "function") return;

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) return entry;

        const currentLayers = normalizeStickerLayers(entry?.data?.stickerLayers);
        const nextLayers = updater(currentLayers);
        if (!Array.isArray(nextLayers)) return entry;

        return {
          ...entry,
          data: {
            ...entry.data,
            stickerLayers: nextLayers,
          },
        };
      })
    );
  }

  function updateSingleLayer(layerId, patch) {
    if (!layerId || typeof patch !== "function") return;
    updateStickerLayers((layers) =>
      layers.map((layer) => {
        if (layer.id !== layerId) return layer;
        return {
          ...layer,
          ...patch(layer),
        };
      })
    );
  }

  function handleGlobalPointerMove(event) {
    const interaction = interactionRef.current;
    if (!interaction || !imageFrameRef.current) return;

    const frameRect = imageFrameRef.current.getBoundingClientRect();
    if (!frameRect.width || !frameRect.height) return;

    if (interaction.mode === "move") {
      const x = clamp01((event.clientX - frameRect.left) / frameRect.width);
      const y = clamp01((event.clientY - frameRect.top) / frameRect.height);
      updateSingleLayer(interaction.layerId, () => ({ x, y }));
      return;
    }

    if (interaction.mode === "resize") {
      const centerX = frameRect.left + interaction.startLayer.x * frameRect.width;
      const centerY = frameRect.top + interaction.startLayer.y * frameRect.height;
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      const diameter = Math.max(24, Math.min(280, Math.floor(distance * 2)));
      updateSingleLayer(interaction.layerId, () => ({ sizePx: diameter }));
    }
  }

  function handleGlobalPointerUp() {
    interactionRef.current = null;
    window.removeEventListener("pointermove", handleGlobalPointerMove);
    window.removeEventListener("pointerup", handleGlobalPointerUp);
  }

  function startLayerInteraction(event, layer, mode = "move") {
    if (!layer?.id) return;
    event.stopPropagation();
    event.preventDefault();

    setSelectedLayerId(layer.id);
    interactionRef.current = {
      mode,
      layerId: layer.id,
      startLayer: layer,
    };

    window.addEventListener("pointermove", handleGlobalPointerMove);
    window.addEventListener("pointerup", handleGlobalPointerUp);
  }

  const setFrameRefs = (node) => {
    imageFrameRef.current = node;
    setSurfaceDropRef(node);
  };

  const removeStickerLayer = (layerId) => {
    if (!layerId) return;
    updateStickerLayers((layers) => layers.filter((layer) => layer.id !== layerId));
    setSelectedLayerId((prev) => (prev === layerId ? "" : prev));
  };

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
        ref={setFrameRefs}
        onPointerDown={() => setSelectedLayerId("")}
        className={`relative overflow-hidden ${
          isPlainWhiteVariant
            ? "rounded-none border-transparent bg-transparent p-0 shadow-none"
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
              isPlainWhiteVariant ? "rounded-none" : "rounded-md"
            }`}
            key={`contribution-graph-${fetchState.version}-${variant}-${range}`}
          />
        </div>

        <div className="pointer-events-none absolute inset-0 z-20">
          {hasStickerLayers
            ? stickerLayers.map((layer) => {
                const sticker = getStickerById(layer.stickerId);
                if (!sticker) return null;
                const isSelected = selectedLayerId === layer.id;

                return (
                  <div
                    key={`${item.id}-${layer.id}`}
                    className="absolute pointer-events-auto"
                    style={{
                      left: `${layer.x * 100}%`,
                      top: `${layer.y * 100}%`,
                      width: `${layer.sizePx}px`,
                      height: `${layer.sizePx}px`,
                      transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                    }}
                  >
                    <button
                      type="button"
                      onPointerDown={(event) => startLayerInteraction(event, layer, "move")}
                      className={`relative h-full w-full cursor-grab rounded-lg border bg-transparent active:cursor-grabbing ${
                        isSelected
                          ? "border-cyan-300/85 shadow-[0_0_0_2px_rgba(34,211,238,0.35)]"
                          : "border-transparent"
                      }`}
                      title={sticker.title}
                    >
                      <SafeImage
                        src={sticker.assetPath}
                        alt={sticker.title}
                        width={Math.max(24, layer.sizePx || 24)}
                        height={Math.max(24, layer.sizePx || 24)}
                        className="h-full w-full object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                        sizes={`${Math.max(24, layer.sizePx || 24)}px`}
                      />
                    </button>

                    {isSelected ? (
                      <>
                        <button
                          type="button"
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            removeStickerLayer(layer.id);
                          }}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-red-500/60 bg-[#0f1115] text-[10px] text-red-200 shadow-[0_8px_16px_rgba(0,0,0,0.35)]"
                          aria-label="Remove sticker"
                          title="Remove sticker"
                        >
                          x
                        </button>
                        <button
                          type="button"
                          onPointerDown={(event) => startLayerInteraction(event, layer, "resize")}
                          className="absolute -bottom-1.5 -right-1.5 h-4 w-4 cursor-se-resize rounded-sm border border-cyan-300/70 bg-cyan-300/35 shadow-[0_6px_14px_rgba(34,211,238,0.3)]"
                          aria-label="Resize sticker"
                          title="Resize sticker"
                        />
                      </>
                    ) : null}
                  </div>
                );
              })
            : showLegacySlotStickers
              ? availableStickerSlots.map((slot) => {
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
                })
              : null}
        </div>

        {showStickerDropSlots ? (
          <div className="pointer-events-none absolute inset-0 z-30 p-1">
            <div
              className={`flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed text-[11px] font-semibold uppercase tracking-[0.12em] transition ${
                isSurfaceDropOver
                  ? "border-cyan-300/90 bg-cyan-300/20 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.35)]"
                  : isPlainWhiteVariant
                    ? "border-slate-400/55 bg-slate-200/30 text-slate-700"
                    : "border-cyan-200/45 bg-cyan-300/8 text-cyan-100/85"
              }`}
            >
              Drop Sticker Anywhere
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}





