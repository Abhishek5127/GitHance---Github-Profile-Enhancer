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
        return <RepoCommitStatsBlock item={slotItem} />;
      case "contribution":
        return <ContributionGraph item={slotItem} />;
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
        <div className="pointer-events-none absolute right-2 top-2 z-20 flex translate-y-1 gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {canEditSlotItem ? (
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onEditItem(slotItem);
              }}
              className="rounded-md border border-white/20 bg-[#0f1115]/95 p-1.5 text-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-white"
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
            className="rounded-md border border-red-500/40 bg-red-500/25 p-1.5 text-red-200 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-red-100"
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
    if (!showLimitToast) return undefined;
    const timer = setTimeout(() => setShowLimitToast(false), 2600);
    return () => clearTimeout(timer);
  }, [showLimitToast]);

  const removeSlotItem = (slotIndex) => {
    if (typeof setItems !== "function") return;
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return;

    setItems((prev) =>
      prev.map((entry) => {
        if (entry.id !== item.id || entry.type !== "section") return entry;
        const currentSlots = Array.isArray(entry?.data?.slots) ? [...entry.data.slots] : [];
        if (slotIndex >= currentSlots.length) return entry;

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

  const wrapperClass = showBorders
    ? "rounded-2xl border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(6,13,24,0.95),rgba(5,9,20,0.9))] p-3"
    : "rounded-2xl bg-transparent p-3";

  const removeSticker = (slotId) => {
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
    <div className={`relative ${wrapperClass}`}>
      {showLimitToast ? (
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-lg border border-amber-300/45 bg-amber-400/15 px-3 py-1 text-[11px] text-amber-100 shadow-[0_12px_28px_rgba(0,0,0,0.35)]">
          GitHub limitation: borders cannot be disabled for this 3-column section.
        </div>
      ) : null}

      <div className="mb-3 flex items-center justify-end gap-2">
        <p className="text-[11px] text-cyan-100/70">{totalSlots} slots</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/70">Borders</span>
          <button
            type="button"
            role="switch"
            aria-checked={showBorders}
            onClick={toggleSectionBorders}
            className={`relative inline-flex h-5 w-9 items-center rounded-full border transition ${
              showBorders
                ? "border-cyan-300/70 bg-cyan-300/25"
                : "border-white/25 bg-[#0f1520]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${
                showBorders ? "translate-x-[18px]" : "translate-x-[2px]"
              }`}
            />
          </button>
        </div>
      </div>

      <div className={`grid min-w-0 gap-2 ${gridClass}`}>
        {resolvedSlots.map((slotItem, slotIndex) => (
          <SectionSlot
            key={`${item.id}-slot-${slotIndex}`}
            sectionId={item.id}
            slotIndex={slotIndex}
            slotItem={slotItem}
            slotMinHeight={Number(variant.canvasSlotMinHeight || 200)}
            showBorders={showBorders}
            onEditItem={onEditItem}
            onRemoveSlotItem={removeSlotItem}
          />
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0 z-20">
        {STICKER_SLOT_PRESETS.map((slot) => {
          const stickerId = normalizedStickers?.[slot.id];
          const sticker = getStickerById(stickerId);
          if (!sticker) return null;

          return (
            <div key={`${item.id}-${slot.id}`} className={`absolute ${slot.positionClass}`}>
              <div className="group/sticker relative pointer-events-auto">
                <SafeImage
                  src={sticker.assetPath}
                  alt={sticker.title}
                  width={getStickerBaseSizePx(sticker.id) * 2}
                  height={getStickerBaseSizePx(sticker.id) * 2}
                  className="object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]"
                  style={{
                    width: `${getStickerBaseSizePx(sticker.id) * 2}px`,
                    height: `${getStickerBaseSizePx(sticker.id) * 2}px`,
                  }}
                  sizes={`${getStickerBaseSizePx(sticker.id) * 2}px`}
                />
                <button
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeSticker(slot.id);
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
            <SectionStickerDropSlot
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
  );
}
