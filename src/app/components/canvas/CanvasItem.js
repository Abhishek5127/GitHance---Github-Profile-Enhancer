"use client";

import { useDndContext, useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContributionGraph from "../blocks/ContributionGraph";
import HeaderBlock from "../blocks/HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "../blocks/TechStackBlock";
import RepoCommitStatsBlock from "../blocks/RepoCommitStatsBlock";
import SectionBlock from "../blocks/SectionBlock";
import {
  STICKER_SLOT_PRESETS,
  buildStickerDropId,
  canItemAcceptStickers,
  getStickerById,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

function StickerDropSlot({ itemId, slot, visible }) {
  const dropId = buildStickerDropId(itemId, slot.id);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`pointer-events-auto absolute z-30 flex h-14 w-14 items-center justify-center rounded-xl border border-dashed text-[10px] font-semibold uppercase tracking-[0.08em] transition ${slot.positionClass} ${
        isOver
          ? "border-cyan-200/90 bg-cyan-300/30 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.4)]"
          : "border-cyan-200/45 bg-cyan-300/10 text-cyan-100/80"
      }`}
    >
      {slot.shortLabel}
    </div>
  );
}

export default function CanvasItem({ item, setItems, onEditItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const { active } = useDndContext();

  const canEdit =
    Boolean(onEditItem) &&
    ["header", "bio", "skills", "contribution"].includes(item.type);
  const isCommitStatsItem = item.type === "commitStat" || item.type === "commits";
  const acceptsStickers = canItemAcceptStickers(item.type);
  const isStickerDragging = active?.data?.current?.source === "sticker-template";
  const stickerAssignments = normalizeStickerAssignments(item?.data?.stickers);

  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  const handleEdit = (event) => {
    event.stopPropagation();
    if (onEditItem) {
      onEditItem(item);
    }
  };

  const handleRemoveSticker = (slotId) => {
    if (!slotId) return;

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

  const renderInner = () => {
    switch (item.type) {
      case "header":
        return <HeaderBlock item={item} setItems={setItems} />;

      case "bio":
        return <BioBlock item={item} setItems={setItems} />;

      case "skills":
        return <TechStackBlock item={item} setItems={setItems} />;

      case "commitStat":
      case "commits":
        return (
          <RepoCommitStatsBlock
            item={item}
            setItems={setItems}
            stickerAssignments={stickerAssignments}
            showStickerDropSlots={isStickerDragging && acceptsStickers}
          />
        );

      case "section":
        return <SectionBlock item={item} setItems={setItems} onEditItem={onEditItem} />;

      case "contribution":
        return <ContributionGraph item={item} setItems={setItems} />;

      default:
        return <div>{item.type}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative mb-1 w-full"
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-40 flex translate-y-1 gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {canEdit ? (
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleEdit}
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
          onClick={handleDelete}
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

      <div className="relative">
        {renderInner()}

        {!isCommitStatsItem && acceptsStickers ? (
          <>
            <div className="pointer-events-none absolute inset-0 z-30">
              {STICKER_SLOT_PRESETS.map((slot) => {
                const stickerId = stickerAssignments?.[slot.id];
                const sticker = getStickerById(stickerId);
                if (!sticker) return null;

                return (
                  <div key={`${item.id}-${slot.id}`} className={`absolute ${slot.positionClass}`}>
                    <div className="group/sticker relative pointer-events-auto">
                      <img
                        src={sticker.assetPath}
                        alt={sticker.title}
                        className={`${sticker.sizeClass} object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}
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

            {isStickerDragging && acceptsStickers ? (
              <div className="pointer-events-none absolute inset-0 z-40">
                {STICKER_SLOT_PRESETS.map((slot) => (
                  <StickerDropSlot
                    key={`drop-slot-${item.id}-${slot.id}`}
                    itemId={item.id}
                    slot={slot}
                    visible
                  />
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
