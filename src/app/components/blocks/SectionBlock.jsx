"use client";

import { useEffect, useMemo, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import SafeImage from "@/app/components/seo/SafeImage";
import HeaderBlock from "./HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "./TechStackBlock";
import SocialLinksBlock from "./SocialLinksBlock";
import GraphicComponentBlock from "./GraphicComponentBlock";
import RepoCommitStatsBlock from "./RepoCommitStatsBlock";
import ContributionGraph from "./ContributionGraph";
import FooterBannerBlock from "./FooterBannerBlock";
import {
  buildSectionSlotDropId,
  getSectionVariantById,
} from "@/app/lib/sectionCatalog";
import {
  STICKER_SLOT_PRESETS,
  buildStickerDropId,
  getMaxStickerBaseSizePx,
  getStickerBaseSizePx,
  getStickerById,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

function SectionSlot({
  sectionId,
  slotIndex,
  slotItem,
  slotMinHeight,
  showBorders,
  onEditItem,
  onRemoveSlotItem,
  defaultUsername = "",
  prefetchedCommitStatsSnapshot = null,
  prefetchedCommitStatsVersion = 0,
}) {
  const dropId = buildSectionSlotDropId(sectionId, slotIndex);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  const baseClass = isOver
    ? "border-cyan-300/65 bg-cyan-300/10"
    : showBorders
      ? "border-white/15 bg-[#0d1524]"
      : "border-transparent bg-transparent";

  const canEditSlotItem =
    Boolean(onEditItem) &&
    slotItem &&
    ["header", "bio", "skills", "social", "graphic", "commitStat", "contribution", "footer"].includes(slotItem.type);

  const renderSlotItem = () => {
    if (!slotItem) {
      return (
        <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center text-xs text-white/55">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-xl leading-none text-white/65">
            +
          </div>
          <p>Drop a canvas block here</p>
          <p className="text-[10px] text-white/40">Add from sidebar first, then drag into slot.</p>
        </div>
      );
    }

    switch (slotItem.type) {
      case "header":
        return <HeaderBlock item={slotItem} />;
      case "bio":
        return <BioBlock item={slotItem} />;
      case "skills":
        return <TechStackBlock item={slotItem} />;
      case "social":
        return <SocialLinksBlock item={slotItem} />;
      case "graphic":
        return <GraphicComponentBlock item={slotItem} />;
      case "commitStat":
      case "commits":
        return (
          <RepoCommitStatsBlock
            item={slotItem}
            defaultUsername={defaultUsername}
            prefetchedSnapshot={prefetchedCommitStatsSnapshot}
            prefetchedSnapshotVersion={prefetchedCommitStatsVersion}
          />
        );
      case "contribution":
        return <ContributionGraph item={slotItem} defaultUsername={defaultUsername} />;
      case "footer":
        return <FooterBannerBlock item={slotItem} />;
      default:
        return (
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-xs text-white/70">
            Unsupported item type: {slotItem.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`group relative min-w-0 rounded-xl border p-2 transition ${baseClass}`}
      style={{ minHeight: `${slotMinHeight}px` }}
    >
      {slotItem ? (
        <div className="pointer-events-auto absolute right-2 top-2 z-20 flex translate-y-0 gap-2 opacity-100 transition-all duration-200 sm:pointer-events-none sm:translate-y-1 sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:translate-y-0 sm:group-hover:opacity-100 sm:group-focus-within:pointer-events-auto sm:group-focus-within:translate-y-0 sm:group-focus-within:opacity-100">
          {canEditSlotItem ? (
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onEditItem(slotItem);
              }}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/20 bg-[#0f1115]/95 p-1.5 text-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-white"
              title="Edit item"
              aria-label="Edit item"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </button>
          ) : null}
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onRemoveSlotItem(slotIndex);
            }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-500/40 bg-red-500/25 p-1.5 text-red-200 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-red-100"
            title="Delete item"
            aria-label="Delete item"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6" />
              <path d="M14 11v6" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="h-full w-full min-w-0 [&>*]:h-full [&>*]:w-full [&>*]:min-w-0">
        {renderSlotItem()}
      </div>
    </div>
  );
}

function SectionStickerDropSlot({ itemId, slot, visible, sizePx = 56 }) {
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

export default function SectionBlock({
  item,
  setItems,
  onEditItem,
  stickerAssignments = {},
  showStickerDropSlots = false,
  defaultUsername = "",
  prefetchedCommitStatsSnapshot = null,
  prefetchedCommitStatsVersion = 0,
}) {
  const variant = getSectionVariantById(item?.data?.variantId);
  const slots = Array.isArray(item?.data?.slots) ? item.data.slots : [];
  const showBorders = item?.data?.showBorders !== false;
  const supportsBorderToggle = variant?.supportsBorderToggle !== false;
  const totalSlots = Number(variant.slotCount || 0);
  const [showLimitToast, setShowLimitToast] = useState(false);
  const normalizedStickers = useMemo(
    () => normalizeStickerAssignments(stickerAssignments),
    [stickerAssignments]
  );
  const maxStickerDisplayPx = useMemo(() => getMaxStickerBaseSizePx() * 2, []);
  const slotSizePx = Math.max(56, Math.round(maxStickerDisplayPx * 0.52));
  const resolvedSlots =
    slots.length >= totalSlots
      ? slots.slice(0, totalSlots)
      : [...slots, ...Array.from({ length: totalSlots - slots.length }, () => null)];

  const gridClass =
    Number(variant.canvasColumns || 1) === 3
      ? "grid-cols-1 md:grid-cols-3"
      : Number(variant.canvasColumns || 1) === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";

  const toggleSectionBorders = () => {
    if (typeof setItems !== "function") return;
    if (!supportsBorderToggle && showBorders) {
      setShowLimitToast(true);
      return;
    }

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) return entry;
        return {
          ...entry,
          data: {
            ...entry.data,
            showBorders: entry?.data?.showBorders === false,
          },
        };
      })
    );
  };

  useEffect(() => {
    if (!showLimitToast) return;

    const timeout = window.setTimeout(() => {
      setShowLimitToast(false);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [showLimitToast]);

  const updateSlotItem = (slotIndex, updater) => {
    if (typeof setItems !== "function") return;

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) return entry;
        const currentSlots = Array.isArray(entry?.data?.slots) ? [...entry.data.slots] : [];
        const target = currentSlots[slotIndex];
        if (!target) return entry;
        currentSlots[slotIndex] = updater(target);
        return {
          ...entry,
          data: {
            ...entry.data,
            slots: currentSlots,
          },
        };
      })
    );
  };

  const removeSlotItem = (slotIndex) => {
    if (typeof setItems !== "function") return;

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id) return entry;
        const currentSlots = Array.isArray(entry?.data?.slots) ? [...entry.data.slots] : [];
        currentSlots[slotIndex] = null;
        return {
          ...entry,
          data: {
            ...entry.data,
            slots: currentSlots,
          },
        };
      })
    );
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
    <div className="relative w-full min-w-0 rounded-2xl border border-white/10 bg-[#0f1115] p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">Section</p>
          <h3 className="mt-1 text-sm font-semibold text-white">{variant.title}</h3>
        </div>

        {supportsBorderToggle ? (
          <button
            type="button"
            onClick={toggleSectionBorders}
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/78 transition hover:bg-white/10"
          >
            {showBorders ? "Hide Borders" : "Show Borders"}
          </button>
        ) : null}
      </div>

      {showLimitToast ? (
        <div className="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          This section layout looks best with borders enabled.
        </div>
      ) : null}

      <div className={`relative grid gap-3 ${gridClass}`}>
        {resolvedSlots.map((slotItem, slotIndex) => (
          <SectionSlot
            key={`${item.id}-slot-${slotIndex}`}
            sectionId={item.id}
            slotIndex={slotIndex}
            slotItem={slotItem}
            slotMinHeight={Number(variant.slotMinHeight || 170)}
            showBorders={showBorders}
            onEditItem={onEditItem}
            onRemoveSlotItem={removeSlotItem}
            defaultUsername={defaultUsername}
            prefetchedCommitStatsSnapshot={prefetchedCommitStatsSnapshot}
            prefetchedCommitStatsVersion={prefetchedCommitStatsVersion}
          />
        ))}
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
                  className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-red-500/55 bg-[#0f1115] text-[10px] text-red-200 opacity-100 transition sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover/sticker:opacity-100"
                  title="Remove sticker"
                  aria-label="Remove sticker"
                >
                  x
                </button>
              </div>
            </div>
          );
        })}

        {showStickerDropSlots
          ? STICKER_SLOT_PRESETS.map((slot) => (
              <SectionStickerDropSlot
                key={`${item.id}-drop-${slot.id}`}
                itemId={item.id}
                slot={slot}
                visible
                sizePx={slotSizePx}
              />
            ))
          : null}
      </div>
    </div>
  );
}
