"use client";

import { useEffect, useMemo, useState } from "react";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import SafeImage from "@/app/components/seo/SafeImage";
import { buildRenderUrl } from "@/app/lib/generateBlockSvg";
import { buildGraphicComponentMarkdownSection } from "@/app/lib/genrateMarkdown";
import {
  GRAPHIC_COMPONENT_ALIGNMENTS,
  GRAPHIC_COMPONENT_VARIANTS,
  buildGraphicComponentPayload,
  normalizeGraphicColor,
  normalizeGraphicComponentData,
  normalizeGraphicThickness,
} from "@/app/lib/graphicComponentCatalog";

const ALIGNMENT_OPTIONS = GRAPHIC_COMPONENT_ALIGNMENTS.map((alignment) => ({
  id: alignment,
  label: alignment.charAt(0).toUpperCase() + alignment.slice(1),
}));

function ColorControl({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-white/45">
        {label}
      </span>
      <div className="mt-2 flex items-center gap-3 rounded-xl border border-white/15 bg-[#111824] px-3 py-2">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-sm font-medium text-white focus:outline-none"
        />
      </div>
    </label>
  );
}

export default function GraphicComponentPicker({
  open,
  onClose,
  onSave,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const initialSnapshot = normalizeGraphicComponentData(initialData || {});
  const [variant, setVariant] = useState(() => initialSnapshot.variant);
  const [alignment, setAlignment] = useState(() => initialSnapshot.alignment);
  const [primaryColor, setPrimaryColor] = useState(() => initialSnapshot.primaryColor);
  const [secondaryColor, setSecondaryColor] = useState(() => initialSnapshot.secondaryColor);
  const [accentColor, setAccentColor] = useState(() => initialSnapshot.accentColor);
  const [thickness, setThickness] = useState(() => initialSnapshot.thickness);


  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const previewMarkdown = useMemo(
    () =>
      buildGraphicComponentMarkdownSection(
        {
          variant,
          alignment,
          primaryColor,
          secondaryColor,
          accentColor,
          thickness,
        },
        { baseUrl }
      ),
    [accentColor, alignment, baseUrl, primaryColor, secondaryColor, thickness, variant]
  );

  const handleClose = () => {
    onClose();
  };

  const handleSubmit = async () => {
    await onSave(
      buildGraphicComponentPayload({
        variant,
        alignment,
        primaryColor: normalizeGraphicColor(primaryColor),
        secondaryColor: normalizeGraphicColor(secondaryColor),
        accentColor: normalizeGraphicColor(accentColor),
        thickness: normalizeGraphicThickness(thickness),
      })
    );
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:inset-y-0 lg:left-72 lg:right-0">
      <div className="h-full p-3 sm:p-5">
        <div className="flex h-full w-full max-w-[1680px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f14]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Edit Mode
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Graphic Components Picker
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Add decorative separators like custom color lines, rgb bars, wave dividers, and lightweight visual accents.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
            <div className="min-h-[320px] border-b border-white/10 p-4 xl:min-h-0 xl:border-b-0 xl:border-r">
              <div className="flex h-full min-h-0 flex-col">
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Variants
                </p>
                <h4 className="mt-2 text-lg font-semibold text-white">
                  Decorative Elements
                </h4>

                <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    {GRAPHIC_COMPONENT_VARIANTS.map((entry) => {
                      const cardSrc = buildRenderUrl({
                        baseUrl,
                        type: "decor",
                        variant: entry.id,
                        params: {
                          pc: primaryColor,
                          sc: secondaryColor,
                          ac: accentColor,
                          t: thickness,
                        },
                      });

                      return (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => setVariant(entry.id)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            variant === entry.id
                              ? "border-cyan-400/70 bg-cyan-500/12"
                              : "border-white/10 bg-white/5 hover:border-white/20"
                          }`}
                        >
                          <div className="overflow-hidden rounded-xl border border-white/10 bg-[#05090f] p-3">
                            <SafeImage
                              src={cardSrc}
                              alt={entry.title}
                              width={900}
                              height={96}
                              className="h-16 w-full object-contain"
                              sizes="(max-width: 1280px) 100vw, 360px"
                            />
                          </div>
                          <p className="mt-3 text-sm font-semibold text-white">
                            {entry.title}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-white/55">
                            {entry.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,0.92fr)_minmax(360px,1.08fr)]">
                <div className="rounded-2xl border border-white/10 bg-[#0d131d] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Controls
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Visual Settings
                  </h4>

                  <div className="mt-4 grid grid-cols-1 gap-4">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Alignment
                      </span>
                      <select
                        value={alignment}
                        onChange={(event) => setAlignment(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-white/15 bg-[#111824] px-3 py-3 text-sm text-white focus:outline-none"
                      >
                        {ALIGNMENT_OPTIONS.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.2em] text-white/45">
                        <span>Thickness</span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
                          {normalizeGraphicThickness(thickness)}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="4"
                        max="18"
                        step="1"
                        value={normalizeGraphicThickness(thickness)}
                        onChange={(event) => setThickness(Number(event.target.value))}
                        className="mt-3 w-full accent-cyan-300"
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                      <ColorControl
                        label="Primary"
                        value={normalizeGraphicColor(primaryColor)}
                        onChange={setPrimaryColor}
                      />
                      <ColorControl
                        label="Secondary"
                        value={normalizeGraphicColor(secondaryColor)}
                        onChange={setSecondaryColor}
                      />
                      <ColorControl
                        label="Accent"
                        value={normalizeGraphicColor(accentColor)}
                        onChange={setAccentColor}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#05090f] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Preview
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    README Output
                  </h4>

                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 pr-3">
                    <ReadmeRenderer readme={previewMarkdown} compact />
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                <button
                  onClick={handleClose}
                  className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSubmit}
                  className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c3a]"
                >
                  {submitLabel}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
