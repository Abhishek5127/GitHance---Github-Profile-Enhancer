"use client";

import { useEffect, useMemo, useState } from "react";
import { useDndContext, useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CanvasItem from "./CanvasItem";
import SafeImage from "@/app/components/seo/SafeImage";
import {
  STICKER_SLOT_PRESETS,
  buildStickerDropId,
  getStickerById,
  getStickerSlotById,
} from "@/app/lib/stickerCatalog";

function CanvasStickerDropZone({ slot, visible }) {
  const dropId = buildStickerDropId("canvas", slot.id);
  const { setNodeRef, isOver } = useDroppable({ id: dropId });

  if (!visible) return null;

  return (
    <div
      ref={setNodeRef}
      className={`pointer-events-auto absolute z-40 flex h-16 w-16 items-center justify-center rounded-xl border border-dashed text-[10px] font-semibold uppercase tracking-[0.08em] transition ${slot.positionClass} ${
        isOver
          ? "border-cyan-200/90 bg-cyan-300/30 text-cyan-50 shadow-[0_0_18px_rgba(34,211,238,0.4)]"
          : "border-cyan-200/45 bg-cyan-300/10 text-cyan-100/80"
      }`}
    >
      {slot.shortLabel}
    </div>
  );
}

function CanvasSticker({ entry, onRemove }) {
  const slot = getStickerSlotById(entry?.data?.slotId);
  const sticker = getStickerById(entry?.data?.stickerId);
  if (!slot || !sticker) return null;

  return (
    <div className={`absolute z-30 pointer-events-auto ${slot.positionClass}`}>
      <div className="group relative pointer-events-auto">
        <SafeImage
          src={sticker.assetPath}
          alt={sticker.title}
          width={160}
          height={160}
          className={`${sticker.sizeClass} object-contain drop-shadow-[0_10px_24px_rgba(0,0,0,0.45)]`}
          sizes="160px"
        />
        <button
          onClick={() => onRemove(entry.id)}
          className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full border border-red-500/55 bg-[#0f1115] text-[10px] text-red-200 opacity-100 transition sm:h-5 sm:w-5 sm:opacity-0 sm:group-hover:opacity-100"
          title="Remove sticker"
          aria-label="Remove sticker"
        >
          x
        </button>
      </div>
    </div>
  );
}

export default function Canvas({
  readmeData,
  items,
  setItems,
  onEditItem,
  defaultUsername = "",
  prefetchedCommitStatsSnapshot = null,
  prefetchedCommitStatsVersion = 0,
}) {
  const [readmeDataContent, setReadmeDataContent] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });
  const { active } = useDndContext();
  const isStickerDragging = active?.data?.current?.source === "sticker-template";

  const normalizedItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);
  const canvasStickerItems = useMemo(
    () => normalizedItems.filter((entry) => entry.type === "canvasSticker"),
    [normalizedItems]
  );
  const sortableCanvasItems = useMemo(
    () => normalizedItems.filter((entry) => entry.type !== "canvasSticker"),
    [normalizedItems]
  );

  useEffect(() => {
    setReadmeDataContent(readmeData);
  }, [readmeData]);

  useEffect(() => {
    if (normalizedItems.length > 0) {
      setReadmeDataContent("");
    }
  }, [normalizedItems]);

  const handleRemoveCanvasSticker = (stickerEntryId) => {
    const normalizedId = String(stickerEntryId || "").trim();
    if (!normalizedId) return;
    setItems((prev) => prev.filter((entry) => entry.id !== normalizedId));
  };

  const hasGeneratedReadme = Boolean(readmeDataContent);
  const hasCanvasItems = sortableCanvasItems.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[480px] overflow-x-clip rounded-2xl border border-dashed p-1.5 pt-3 sm:min-h-[600px] ${
        isOver ? "border-cyan-400 bg-[#101722]" : "border-white/15 bg-[#0d1117]"
      }`}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-2">
        {hasGeneratedReadme ? (
          <div className="pointer-events-auto flex gap-2">
            <button
              onClick={() => setReadmeDataContent("")}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-[#111824]/90 px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#151d29]"
            >
              Create
            </button>
            <button
              onClick={() => {
                setItems([]);
                setReadmeDataContent("");
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30"
            >
              Clear
            </button>
          </div>
        ) : hasCanvasItems ? (
          <button
            onClick={() => setItems([])}
            className="pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full border border-red-500/40 bg-[#160c0c]/90 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/25"
          >
            Clear
          </button>
        ) : null}
      </div>

      {hasGeneratedReadme ? (
        <div className="overflow-x-auto px-2 pb-4 pt-12">
          <article
            className="markdown-body min-w-0 break-words"
            dangerouslySetInnerHTML={{ __html: readmeDataContent }}
          />
        </div>
      ) : !hasCanvasItems ? (
        <div className="flex min-h-[420px] items-center justify-center px-6 py-14 text-center text-sm text-white/50 sm:min-h-[540px]">
          Create Readme
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-0">
        {canvasStickerItems.map((entry) => (
          <CanvasSticker
            key={entry.id}
            entry={entry}
            onRemove={handleRemoveCanvasSticker}
          />
        ))}
      </div>

      {isStickerDragging ? (
        <div className="pointer-events-none absolute inset-0">
          {STICKER_SLOT_PRESETS.map((slot) => (
            <CanvasStickerDropZone
              key={`canvas-sticker-slot-${slot.id}`}
              slot={slot}
              visible
            />
          ))}
        </div>
      ) : null}

      <SortableContext
        items={sortableCanvasItems.map((entry) => entry.id)}
        strategy={verticalListSortingStrategy}
      >
        {sortableCanvasItems.map((item) => (
          <CanvasItem
            key={item.id}
            item={item}
            setItems={setItems}
            onEditItem={onEditItem}
            defaultUsername={defaultUsername}
            prefetchedCommitStatsSnapshot={prefetchedCommitStatsSnapshot}
            prefetchedCommitStatsVersion={prefetchedCommitStatsVersion}
          />
        ))}
      </SortableContext>
    </div>
  );
}
