"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import SafeImage from "@/app/components/seo/SafeImage";
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
      className={`group flex h-28 w-28 shrink-0 cursor-grab items-center justify-center rounded-lg border bg-[#0a1017] transition active:cursor-grabbing sm:h-36 sm:w-36 md:h-40 md:w-40 ${
        isDragging
          ? "border-cyan-300/70 ring-2 ring-cyan-300/55"
          : "border-white/10 hover:border-cyan-300/45 hover:bg-[#101b2a]"
      }`}
    >
      <SafeImage
        src={sticker.assetPath}
        alt={sticker.title}
        width={160}
        height={160}
        className="h-full w-full object-contain"
        sizes="160px"
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
    <div className="pointer-events-none fixed inset-0 z-50 lg:inset-y-0 lg:left-72 lg:right-0">
      <div className="pointer-events-auto h-full w-full overflow-y-auto bg-[#0d1117] p-3 shadow-[24px_0_48px_rgba(0,0,0,0.45)] sm:p-4 lg:w-[580px] lg:border-r lg:border-white/10">
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

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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

