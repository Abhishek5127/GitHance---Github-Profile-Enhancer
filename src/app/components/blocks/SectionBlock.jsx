"use client";

import { useDroppable } from "@dnd-kit/core";
import HeaderBlock from "./HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "./TechStackBlock";
import RepoCommitStatsBlock from "./RepoCommitStatsBlock";
import ContributionGraph from "./ContributionGraph";
import {
  buildSectionSlotDropId,
  getSectionVariantById,
} from "@/app/lib/sectionCatalog";

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
    ["header", "bio", "skills"].includes(slotItem.type);

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
      case "commitStat":
      case "commits":
        return <RepoCommitStatsBlock item={slotItem} />;
      case "contribution":
        return <ContributionGraph item={slotItem} />;
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
      className={`relative min-w-0 rounded-xl border p-2 transition ${baseClass}`}
      style={{ minHeight: `${slotMinHeight}px` }}
    >
      {slotItem ? (
        <div className="absolute right-2 top-2 z-20 flex gap-2">
          {canEditSlotItem ? (
            <button
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onEditItem(slotItem);
              }}
              className="rounded-md border border-white/20 bg-[#0f1115]/90 p-1.5 text-white/80 hover:text-white"
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
            className="rounded-md border border-red-500/40 bg-red-500/20 p-1.5 text-red-200 hover:text-red-100"
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

export default function SectionBlock({ item, setItems, onEditItem }) {
  const variant = getSectionVariantById(item?.data?.variantId);
  const slots = Array.isArray(item?.data?.slots) ? item.data.slots : [];
  const showBorders = item?.data?.showBorders !== false;
  const totalSlots = Number(variant.slotCount || 0);
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

  return (
    <div className={wrapperClass}>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Section</p>
          <p className="text-sm font-semibold text-white">{variant.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSectionBorders}
            className="rounded-md border border-white/20 px-2 py-1 text-[11px] text-white/75 hover:text-white"
          >
            Borders: {showBorders ? "On" : "Off"}
          </button>
          <p className="text-[11px] text-cyan-100/70">{totalSlots} slots</p>
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
    </div>
  );
}
