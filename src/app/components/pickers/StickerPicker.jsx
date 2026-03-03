"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { STICKER_LIBRARY, buildStickerDragId } from "@/app/lib/stickerCatalog";

function StickerCard({ sticker }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: buildStickerDragId(sticker.id),
    data: {
      source: "sticker-template",
      stickerId: sticker.id,
    },
  });

  const style = {
    opacity: isDragging ? 0.65 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group flex h-40 w-40 shrink-0 cursor-grab items-center justify-center rounded-lg border bg-[#0a1017] transition active:cursor-grabbing ${
        isDragging
          ? "border-cyan-300/70 ring-2 ring-cyan-300/55"
          : "border-white/10 hover:border-cyan-300/45 hover:bg-[#101b2a]"
      }`}
    >
      <img
        src={sticker.assetPath}
        alt={sticker.title}
        className="h-full w-full object-contain"
      />
    </div>
  );
}

export default function StickerPicker({
  open,
  onClose,
}) {
  const stickers = useMemo(() => STICKER_LIBRARY, []);

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-72 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto h-full w-[580px] overflow-y-auto border-r border-white/10 bg-[#0d1117] p-4 shadow-[24px_0_48px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Stickers</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Drag to Place</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {stickers.map((sticker) => (
            <StickerCard
              key={sticker.id}
              sticker={sticker}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
