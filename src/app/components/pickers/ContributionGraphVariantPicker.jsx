"use client";

import { useMemo, useState } from "react";
import {
  CONTRIBUTION_GRAPH_VARIANTS,
  normalizeContributionVariant,
} from "@/app/lib/renderers/contributionHeatmapSvg";

const DEFAULT_VARIANT = "classic";

const VARIANT_CARD_STYLES = {
  classic:
    "border-emerald-300/25 bg-[linear-gradient(135deg,rgba(10,20,12,0.92),rgba(8,14,10,0.88))]",
  neon:
    "border-cyan-300/25 bg-[linear-gradient(135deg,rgba(6,16,26,0.95),rgba(8,10,20,0.9))]",
  sunset:
    "border-orange-300/25 bg-[linear-gradient(135deg,rgba(28,12,16,0.95),rgba(30,16,20,0.9))]",
};

const VARIANT_DOT_STYLES = {
  classic: "bg-emerald-400/75",
  neon: "bg-cyan-300/85",
  sunset: "bg-orange-300/85",
};

export default function ContributionGraphVariantPicker({
  open,
  onClose,
  onSave,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const initialVariant = normalizeContributionVariant(
    initialData?.variant || DEFAULT_VARIANT
  );
  const [selectedVariant, setSelectedVariant] = useState(initialVariant);

  const selectedMeta = useMemo(
    () =>
      CONTRIBUTION_GRAPH_VARIANTS.find((entry) => entry.id === selectedVariant) ||
      CONTRIBUTION_GRAPH_VARIANTS[0],
    [selectedVariant]
  );

  const handleClose = () => {
    setSelectedVariant(initialVariant);
    onClose();
  };

  const handleSubmit = async () => {
    await onSave({
      variant: normalizeContributionVariant(selectedVariant),
    });
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="relative h-full w-[560px] overflow-scroll border-l border-white/10 bg-[#0d1117] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">
              Contribution Graph
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Choose Graph Variant</h3>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {CONTRIBUTION_GRAPH_VARIANTS.map((variant) => {
            const active = selectedVariant === variant.id;
            const cardStyle = VARIANT_CARD_STYLES[variant.id] || VARIANT_CARD_STYLES.classic;
            const dotStyle = VARIANT_DOT_STYLES[variant.id] || VARIANT_DOT_STYLES.classic;

            return (
              <button
                key={variant.id}
                onClick={() => setSelectedVariant(variant.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${
                  active
                    ? "border-cyan-300/65 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.16)]"
                    : "border-white/10 bg-white/5 text-white/80 hover:border-cyan-300/35"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{variant.title}</p>
                    <p className="mt-1 text-xs text-inherit/85">{variant.description}</p>
                  </div>
                  <span className="rounded-md border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em]">
                    {variant.id}
                  </span>
                </div>

                <div className={`mt-3 rounded-xl border p-2 ${cardStyle}`}>
                  <div className="grid grid-cols-12 gap-1">
                    {Array.from({ length: 60 }).map((_, index) => (
                      <div
                        key={`${variant.id}-preview-dot-${index}`}
                        className={`h-2.5 w-full rounded-[3px] ${
                          index % 5 === 0 ? dotStyle : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-cyan-100/75">
          Selected: <span className="font-semibold">{selectedMeta?.title || "Classic"}</span>
        </p>

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
