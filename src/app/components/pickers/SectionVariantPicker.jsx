"use client";

import { useMemo, useState } from "react";
import { README_SECTION_VARIANTS } from "@/app/lib/sectionCatalog";

const DEFAULT_VARIANT_ID = README_SECTION_VARIANTS[0]?.id || "equal-2";

export default function SectionVariantPicker({
  open,
  onClose,
  onSave,
  submitLabel = "Add Section",
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(DEFAULT_VARIANT_ID);

  const selectedVariant = useMemo(
    () =>
      README_SECTION_VARIANTS.find((variant) => variant.id === selectedVariantId) ||
      README_SECTION_VARIANTS[0],
    [selectedVariantId]
  );

  const handleClose = () => {
    setSelectedVariantId(DEFAULT_VARIANT_ID);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedVariant?.id) return;
    await onSave({
      variantId: selectedVariant.id,
    });
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="relative h-full w-[560px] overflow-hidden border-l border-white/10 bg-[#0d1117] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Sections</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Choose Section Layout</h3>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {README_SECTION_VARIANTS.map((variant) => {
            const active = selectedVariantId === variant.id;
            return (
              <button
                key={variant.id}
                onClick={() => setSelectedVariantId(variant.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-cyan-300/65 bg-cyan-300/10 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-cyan-300/35"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{variant.title}</p>
                    <p className="mt-1 text-xs text-inherit/85">{variant.description}</p>
                  </div>
                  <span className="rounded-md border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                    {variant.slotCount} slots
                  </span>
                </div>

                <div
                  className={`mt-3 grid gap-2 rounded-xl border border-white/10 bg-[#0b1220] p-2 ${
                    variant.canvasColumns === 3
                      ? "grid-cols-3"
                      : variant.canvasColumns === 2
                        ? "grid-cols-2"
                        : "grid-cols-1"
                  }`}
                >
                  {Array.from({ length: variant.slotCount }).map((_, index) => (
                    <div
                      key={`${variant.id}-preview-${index}`}
                      className="flex h-12 items-center justify-center rounded-lg border border-dashed border-cyan-200/35 text-xs text-cyan-100/80"
                    >
                      Slot {index + 1}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
          <button
            onClick={handleClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-xl bg-[#00e5ff] px-4 py-2 text-sm font-semibold text-[#031016] transition hover:bg-[#6bf3ff]"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
