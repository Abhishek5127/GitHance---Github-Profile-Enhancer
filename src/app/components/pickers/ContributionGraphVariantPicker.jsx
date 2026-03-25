"use client";

import { useMemo, useState } from "react";
import {
  CONTRIBUTION_GRAPH_RANGES,
  CONTRIBUTION_GRAPH_VARIANTS,
  normalizeContributionRange,
  normalizeContributionVariant,
} from "@/app/lib/renderers/contributionHeatmapSvg";

const DEFAULT_VARIANT = "classic";
const DEFAULT_RANGE = "yearly";

const THEME_VISUALS = {
  classic: {
    swatch: "#39d353",
    frameBg: "#0d1117",
    frameBorder: "#30363d",
    titleColor: "#e6edf3",
    subtitleColor: "#8b949e",
    gridBg: "#010409",
    emptyCell: "#161b22",
    levels: ["#0e4429", "#006d32", "#26a641", "#39d353"],
  },
  neon: {
    swatch: "#6ef6ff",
    frameBg: "#050b14",
    frameBorder: "#1e3952",
    titleColor: "#e9fdff",
    subtitleColor: "#8ed8e2",
    gridBg: "#081224",
    emptyCell: "#101827",
    levels: ["#0b3c52", "#0b6f86", "#00b7d5", "#6ef6ff"],
  },
  sunset: {
    swatch: "#ff8b5b",
    frameBg: "#140c14",
    frameBorder: "#473043",
    titleColor: "#ffe9de",
    subtitleColor: "#d7a89d",
    gridBg: "#1b1120",
    emptyCell: "#241326",
    levels: ["#4a1f3a", "#7b2e4d", "#c1535a", "#ff8b5b"],
  },
  tortoise: {
    swatch: "#8e9ba9",
    frameBg: "#ffffff",
    frameBorder: "#d8dde3",
    titleColor: "#101418",
    subtitleColor: "#4f5b66",
    gridBg: "#f6f7f9",
    emptyCell: "#eef2f5",
    levels: ["#dde4ea", "#c8d1da", "#adb9c5", "#8e9ba9"],
  },
};

const FALLBACK_THEME = THEME_VISUALS.classic;

function buildPreviewCells(range, theme) {
  const isMonthly = range === "monthly";
  const total = isMonthly ? 36 : 96;
  const period = isMonthly ? 5 : 9;
  const cells = [];

  for (let index = 0; index < total; index += 1) {
    const wave = (index * 7 + Math.floor(index / period) * 3) % 11;
    if (wave <= 3) {
      cells.push(theme.emptyCell);
      continue;
    }

    const levelIndex = Math.min(theme.levels.length - 1, Math.max(0, wave - 4));
    cells.push(theme.levels[levelIndex]);
  }

  return cells;
}

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
  const initialRange = normalizeContributionRange(
    initialData?.range || DEFAULT_RANGE
  );

  const [selectedVariant, setSelectedVariant] = useState(initialVariant);
  const [selectedRange, setSelectedRange] = useState(initialRange);

  const themeOptions = useMemo(
    () =>
      CONTRIBUTION_GRAPH_VARIANTS.map((variant) => ({
        ...variant,
        visuals: THEME_VISUALS[variant.id] || FALLBACK_THEME,
      })),
    []
  );

  const selectedTheme = useMemo(
    () =>
      themeOptions.find((entry) => entry.id === selectedVariant) || themeOptions[0],
    [selectedVariant, themeOptions]
  );

  const selectedRangeMeta = useMemo(
    () =>
      CONTRIBUTION_GRAPH_RANGES.find((entry) => entry.id === selectedRange) ||
      CONTRIBUTION_GRAPH_RANGES[0],
    [selectedRange]
  );

  const previewCells = useMemo(
    () => buildPreviewCells(selectedRange, selectedTheme.visuals),
    [selectedRange, selectedTheme]
  );

  const handleClose = () => {
    setSelectedVariant(initialVariant);
    setSelectedRange(initialRange);
    onClose();
  };

  const handleSubmit = async () => {
    await onSave({
      variant: normalizeContributionVariant(selectedVariant),
      range: normalizeContributionRange(selectedRange),
    });
    handleClose();
  };

  if (!open) return null;

  const isMonthly = selectedRange === "monthly";
  const previewColumns = isMonthly ? 18 : 24;
  const theme = selectedTheme.visuals;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:inset-y-0 lg:left-72 lg:right-0">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0d1117] p-3 sm:p-4 lg:w-[560px] lg:border-r lg:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">
              Contribution Graph
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Pick Range and Theme</h3>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">
              Contribution Window
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CONTRIBUTION_GRAPH_RANGES.map((rangeOption) => {
                const active = selectedRange === rangeOption.id;
                return (
                  <button
                    key={rangeOption.id}
                    onClick={() => setSelectedRange(rangeOption.id)}
                    className={`rounded-xl border p-3 text-left transition ${
                      active
                        ? "border-cyan-300/65 bg-cyan-300/10 text-cyan-100"
                        : "border-white/15 bg-[#0b1220] text-white/75 hover:border-cyan-300/35"
                    }`}
                  >
                    <p className="text-sm font-semibold">{rangeOption.title}</p>
                    <p className="mt-1 text-[11px] text-inherit/85">
                      {rangeOption.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">
                  Theme
                </p>
                <p className="mt-1 text-xs text-white/70">
                  Color only changes, layout stays the same.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {themeOptions.map((option) => {
                  const active = selectedVariant === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedVariant(option.id)}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border-2 transition ${
                        active
                          ? "border-cyan-200 shadow-[0_0_0_2px_rgba(34,211,238,0.35)]"
                          : "border-white/25 hover:border-white/55"
                      }`}
                      title={option.title}
                      aria-label={`Select ${option.title} theme`}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: option.visuals.swatch }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="mt-3 rounded-xl border p-3"
              style={{
                backgroundColor: theme.frameBg,
                borderColor: theme.frameBorder,
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold" style={{ color: theme.titleColor }}>
                  Contribution Graph
                </p>
                <p className="text-xs" style={{ color: theme.subtitleColor }}>
                  {isMonthly ? "Last 30 Days" : "Last 12 Months"}
                </p>
              </div>

              <div
                className="rounded-lg border p-2"
                style={{
                  backgroundColor: theme.gridBg,
                  borderColor: theme.frameBorder,
                }}
              >
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: `repeat(${previewColumns}, minmax(0, 1fr))` }}
                >
                  {previewCells.map((color, index) => (
                    <span
                      key={`contribution-preview-cell-${index}`}
                      className="h-2 rounded-[2px]"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs text-cyan-100/75">
          Selected Theme: <span className="font-semibold">{selectedTheme.title}</span>
        </p>
        <p className="mt-1 text-xs text-cyan-100/75">
          Range:{" "}
          <span className="font-semibold">
            {selectedRangeMeta?.title || "Yearly"}
          </span>
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
