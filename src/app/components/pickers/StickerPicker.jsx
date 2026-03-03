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
      className={`cursor-grab rounded-2xl border border-white/15 bg-white/5 p-3 text-left transition active:cursor-grabbing ${
        isDragging ? "ring-2 ring-cyan-300/55" : "hover:border-cyan-300/45 hover:bg-[#101b2a]"
      }`}
      title="Drag onto a highlighted drop slot"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-[#0a1017]">
          <img
            src={sticker.assetPath}
            alt={sticker.title}
            className={`${sticker.sizeClass} object-contain`}
          />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{sticker.title}</p>
          <p className="mt-1 text-xs text-white/65">{sticker.description}</p>
        </div>
      </div>
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
      <div className="pointer-events-auto h-full w-[380px] overflow-y-auto border-r border-white/10 bg-[#0d1117] p-4 shadow-[24px_0_48px_rgba(0,0,0,0.45)]">
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

        <p className="mb-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-xs text-cyan-100/85">
          Drag stickers onto highlighted blocks. Contribution Graph supports free placement and resize.
        </p>

        <div className="space-y-3">
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
