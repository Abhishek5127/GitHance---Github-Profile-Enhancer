"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { buildBioPayload } from "@/app/services/githubData.service";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import SafeImage from "@/app/components/seo/SafeImage";
import { buildTechStackMarkdownSection } from "@/app/lib/genrateMarkdown";
import {
  TECH_STACK_ALIGNMENTS,
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  TECH_STACK_LAYOUTS,
  buildTechStackPayload,
  getTechIconUrl,
  inferTechStackDataFromRepos,
  mergeTechStackItems,
  normalizeTechItem,
  normalizeTechStackData,
  searchTechCatalog,
  groupTechStackItems,
} from "@/app/lib/techStackCatalog";

const TECH_DRAG_MIME = "application/x-githance-tech";

const CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  ...TECH_STACK_CATEGORY_ORDER.map((category) => ({
    id: category,
    label: TECH_STACK_CATEGORY_LABELS[category],
  })),
];

const ALIGNMENT_OPTIONS = TECH_STACK_ALIGNMENTS.map((alignment) => ({
  id: alignment,
  label: alignment.charAt(0).toUpperCase() + alignment.slice(1),
}));

const LAYOUT_OPTIONS = TECH_STACK_LAYOUTS.map((layout) => ({
  id: layout,
  label: layout === "square-grid" ? "Square Grid" : "Categorized",
}));

const ALIGNMENT_JUSTIFY_CLASS = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

const isStackDataEmpty = (data) => {
  if (!data || typeof data !== "object") return true;
  if (Array.isArray(data.items) && data.items.length > 0) return false;
  if (Array.isArray(data.stack) && data.stack.length > 0) return false;
  return true;
};

const FEEDBACK_CLASS_MAP = {
  success: "text-emerald-300",
  info: "text-cyan-300",
  error: "text-red-300",
};

function TechIcon({ item, size = 30, className = "" }) {
  const iconSrc = getTechIconUrl(item);

  return (
    <div
      className={`flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 ${className}`}
      title={item.name}
    >
      {iconSrc ? (
        <SafeImage
          src={iconSrc}
          alt={item.name}
          width={size}
          height={size}
          className="h-7 w-7 shrink-0 object-contain"
          onErrorHide
        />
      ) : null}
      <span className="text-xs text-white/85">{item.name}</span>
    </div>
  );
}

const parseDragPayload = (event) => {
  const serialized =
    event.dataTransfer.getData(TECH_DRAG_MIME) ||
    event.dataTransfer.getData("text/plain");
  if (!serialized) return null;

  try {
    const parsed = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const setDragPayload = (event, payload) => {
  const serialized = JSON.stringify(payload);
  event.dataTransfer.setData(TECH_DRAG_MIME, serialized);
  event.dataTransfer.setData("text/plain", serialized);
  event.dataTransfer.effectAllowed =
    payload?.source === "selected" ? "move" : "copyMove";
};

export default function TechStackVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
  githubUsername = "",
  githubToken = "",
}) {
  const { data: session, status } = useSession();
  const resolvedGithubUsername = String(githubUsername || session?.username || "")
    .trim()
    .toLowerCase();
  const resolvedGithubToken = String(githubToken || session?.accessToken || "").trim();

  const [variant, setVariant] = useState("categorized");
  const [alignment, setAlignment] = useState("left");
  const [layout, setLayout] = useState("categorized");
  const [items, setItems] = useState([]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [dragHoverKey, setDragHoverKey] = useState("");

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeTechStackData(initialData, {
      includeDefaults: isStackDataEmpty(initialData),
    });

    setVariant(normalized.variant || "categorized");
    setAlignment(normalized.alignment || "left");
    setLayout(normalized.layout || "categorized");
    setItems(normalized.items || []);
    setQuery("");
    setActiveCategory("all");
    setIsScanning(false);
    setFeedback(null);
    setDragHoverKey("");
  }, [open, initialData]);

  const groupedItems = useMemo(() => groupTechStackItems(items), [items]);

  const catalogResults = useMemo(
    () =>
      searchTechCatalog(query, {
        category: activeCategory,
        limit: 120,
      }),
    [query, activeCategory]
  );

  const previewMarkdown = useMemo(() => {
    if (!items.length) return "";

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return buildTechStackMarkdownSection(
      {
        variant,
        alignment,
        layout,
        items,
      },
      {
        includeHeading: true,
        baseUrl,
      }
    );
  }, [alignment, items, layout, variant]);

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

  const upsertItemInCategory = (rawItem, targetCategory) => {
    if (!rawItem) return false;

    const fallbackCategory = targetCategory || rawItem?.category || "frameworks";
    const normalized = normalizeTechItem(
      { ...rawItem, category: fallbackCategory },
      fallbackCategory
    );
    if (!normalized) return false;

    setItems((prev) => {
      const existingIndex = prev.findIndex((entry) => entry.id === normalized.id);
      if (existingIndex === -1) {
        return mergeTechStackItems(prev, [normalized]);
      }

      const current = prev[existingIndex];
      if (current.category === normalized.category) {
        return prev;
      }

      const next = [...prev];
      next[existingIndex] = {
        ...current,
        category: normalized.category,
      };

      return mergeTechStackItems(next, []);
    });

    return true;
  };

  const moveSelectedItemToCategory = (itemId, category) => {
    if (!itemId || !category) return;

    setItems((prev) => {
      const next = [...prev];
      const index = next.findIndex((entry) => entry.id === itemId);
      if (index === -1) return prev;

      const current = next[index];
      if (!current) return prev;
      if (current.category === category) return prev;

      next[index] = { ...current, category };

      return mergeTechStackItems(next, []);
    });
  };

  const removeItemById = (itemId) => {
    setItems((prev) => prev.filter((entry) => entry.id !== itemId));
  };

  const draftCustomItem = useMemo(() => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return null;

    const category = activeCategory === "all" ? "frameworks" : activeCategory;
    return normalizeTechItem({ name: trimmed, category }, category);
  }, [query, activeCategory]);

  const handleDropOnCategory = (event, category) => {
    event.preventDefault();
    setDragHoverKey("");

    const payload = parseDragPayload(event);
    if (!payload) return;

    if (payload.source === "selected") {
      moveSelectedItemToCategory(payload.itemId, category);
      return;
    }

    if (payload.source === "catalog" || payload.source === "custom") {
      const itemAdded = upsertItemInCategory(payload.item, category);
      if (itemAdded && payload.source === "custom") {
        setQuery("");
      }
    }
  };

  const handleDropOnTrash = (event) => {
    event.preventDefault();
    setDragHoverKey("");

    const payload = parseDragPayload(event);
    if (!payload) return;

    if (payload.source !== "selected") {
      setFeedback({
        type: "info",
        message: "Only selected technologies can be removed here.",
      });
      return;
    }

    removeItemById(payload.itemId);
    setFeedback({
      type: "success",
      message: "Technology removed.",
    });
  };

  const handleAnalyzeRepositories = async () => {
    if (isScanning) return;

    if (status === "loading" && !resolvedGithubUsername) {
      setFeedback({
        type: "info",
        message: "Session is still loading. Try again in a moment.",
      });
      return;
    }

    if (!resolvedGithubUsername) {
      setFeedback({
        type: "error",
        message: "Set your GitHub username on the landing page to scan repositories.",
      });
      return;
    }

    try {
      setIsScanning(true);
      setFeedback({
        type: "info",
        message: "Scanning repositories and inferring your stack...",
      });

      const payload = await buildBioPayload({
        username: resolvedGithubUsername,
        token: resolvedGithubToken,
        repoLimit: 50,
        forceRefresh: true,
      });

      const scanned = inferTechStackDataFromRepos(payload?.repos || []);
      setItems((prev) => mergeTechStackItems(scanned.items || [], prev));

      setFeedback({
        type: "success",
        message: `Scanned ${payload?.repos?.length || 0} repositories and updated your stack.`,
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error?.message || "Failed to analyze repositories.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = () => {
    const payload = buildTechStackPayload({
      variant,
      alignment,
      layout,
      items,
    });

    onSave(payload);
    onClose();
  };
  const iconAlignmentClass =
    ALIGNMENT_JUSTIFY_CLASS[alignment] || ALIGNMENT_JUSTIFY_CLASS.left;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm lg:inset-y-0 lg:left-72 lg:right-0">
      <div className="h-full p-3 sm:p-5">
        <div className="flex h-full w-full max-w-[1700px] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f14]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Edit Mode
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Tech Stack Variant Picker
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Drag technologies into category buckets, then choose whether the README renders them as categorized rows or a square grid.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={variant}
                onChange={(event) => setVariant(event.target.value)}
                className="rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="categorized">Categorized</option>
                <option value="grid">Grid</option>
                <option value="orbit">Orbit</option>
                <option value="barcode">Barcode</option>
              </select>

              <select
                value={alignment}
                onChange={(event) => setAlignment(event.target.value)}
                className="rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
              >
                {ALIGNMENT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    Align {option.label}
                  </option>
                ))}
              </select>

              <select
                value={layout}
                onChange={(event) => setLayout(event.target.value)}
                className="rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
              >
                {LAYOUT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                onClick={onClose}
                className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)]">
            <div className="min-h-[320px] border-b border-white/10 p-4 xl:min-h-0 xl:border-b-0 xl:border-r">
              <div className="flex h-full min-h-0 flex-col gap-3">
                <button
                  onClick={handleAnalyzeRepositories}
                  disabled={isScanning}
                  className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isScanning ? "Scanning repositories..." : "Analyze Repositories"}
                </button>

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search technologies..."
                  className="w-full rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
                />

                <div className="flex flex-wrap gap-2">
                  {CATEGORY_FILTERS.map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setActiveCategory(filter.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        activeCategory === filter.id
                          ? "border-cyan-400/70 bg-cyan-500/20 text-cyan-200"
                          : "border-white/15 bg-white/5 text-white/70 hover:text-white"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>

                {draftCustomItem ? (
                  <div
                    draggable
                    onDragStart={(event) =>
                      setDragPayload(event, {
                        source: "custom",
                        item: draftCustomItem,
                      })
                    }
                    onDragEnd={() => setDragHoverKey("")}
                    className="cursor-grab rounded-xl border border-dashed border-cyan-400/60 bg-cyan-500/10 p-3 text-sm text-cyan-100 active:cursor-grabbing"
                    title="Drag to a category bucket"
                  >
                    Drag custom item to add: {draftCustomItem.name}
                  </div>
                ) : null}

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
                  <div className="space-y-2">
                    {catalogResults.map((entry) => {
                      const isAdded = items.some((item) => item.id === entry.id);
                      return (
                        <div
                          key={entry.id}
                          draggable
                          onDragStart={(event) =>
                            setDragPayload(event, {
                              source: "catalog",
                              item: {
                                id: entry.id,
                                name: entry.name,
                                category: entry.category,
                                iconId: entry.iconId,
                                custom: false,
                              },
                            })
                          }
                          onDragEnd={() => setDragHoverKey("")}
                          className={`flex cursor-grab items-center justify-between gap-2 rounded-xl border bg-white/5 p-2 active:cursor-grabbing ${
                            isAdded
                              ? "border-emerald-500/40"
                              : "border-white/10 hover:border-cyan-400/40"
                          }`}
                          title="Drag to a category bucket"
                        >
                          <TechIcon item={entry} />
                          <div className="flex items-center gap-2">
                            <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:inline-flex">
                              {TECH_STACK_CATEGORY_LABELS[entry.category]}
                            </span>
                            <button
                              onClick={() =>
                                upsertItemInCategory(entry, entry.category)
                              }
                              className={`rounded-lg px-2 py-1 text-xs font-medium transition ${
                                isAdded
                                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                                  : "border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                              }`}
                            >
                              {isAdded ? "In Stack" : "Quick Add"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 2xl:grid-cols-2">
                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d131d] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Technologies
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Drag and Drop
                  </h4>
                  <p className="mt-1 text-sm text-white/60">
                    Drag from left panel into a category. Drag selected items between categories to edit.
                  </p>

                  <div
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragHoverKey("trash");
                    }}
                    onDrop={handleDropOnTrash}
                    onDragLeave={() => {
                      if (dragHoverKey === "trash") setDragHoverKey("");
                    }}
                    className={`mt-4 rounded-xl border border-dashed p-3 text-center text-sm transition ${
                      dragHoverKey === "trash"
                        ? "border-red-400/70 bg-red-500/20 text-red-100"
                        : "border-red-500/40 bg-red-500/10 text-red-200"
                    }`}
                  >
                    Drop Here To Remove
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
                    {TECH_STACK_CATEGORY_ORDER.map((category) => {
                      const categoryItems = groupedItems[category] || [];
                      const dropKey = `category:${category}`;

                      return (
                        <div
                          key={`bucket-${category}`}
                          onDragOver={(event) => {
                            event.preventDefault();
                            setDragHoverKey(dropKey);
                            event.dataTransfer.dropEffect = "move";
                          }}
                          onDrop={(event) => handleDropOnCategory(event, category)}
                          onDragLeave={() => {
                            if (dragHoverKey === dropKey) setDragHoverKey("");
                          }}
                          className={`rounded-xl border p-3 transition ${
                            dragHoverKey === dropKey
                              ? "border-cyan-400/70 bg-cyan-500/15"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <p className="text-xs uppercase tracking-[0.2em] text-white/55">
                            {TECH_STACK_CATEGORY_LABELS[category]}
                          </p>
                          <div
                            className={`mt-2 flex min-h-12 flex-wrap content-start gap-2 ${iconAlignmentClass}`}
                          >
                            {categoryItems.map((item) => (
                              <div
                                key={`${category}-${item.id}-${item.name}`}
                                draggable
                                onDragStart={(event) =>
                                  setDragPayload(event, {
                                    source: "selected",
                                    itemId: item.id,
                                  })
                                }
                                onDragEnd={() => setDragHoverKey("")}
                                className="group relative flex cursor-grab items-center gap-2 rounded-xl border border-white/10 bg-[#121b2a] px-2.5 py-1.5 text-xs text-white/85 active:cursor-grabbing"
                                title={`${item.name} (drag to move or trash)`}
                              >
                                <button
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeItemById(item.id);
                                  }}
                                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border border-red-500/60 bg-[#0b0f14] text-[10px] text-red-200 opacity-0 transition group-hover:opacity-100"
                                  aria-label={`Delete ${item.name}`}
                                  title={`Delete ${item.name}`}
                                >
                                  x
                                </button>

                                <SafeImage
                                  src={getTechIconUrl(item)}
                                  alt={item.name}
                                  width={22}
                                  height={22}
                                  className="h-5 w-5 shrink-0 object-contain"
                                  onErrorHide
                                />
                                <span>{item.name}</span>
                              </div>
                            ))}
                            {!categoryItems.length ? (
                              <p className="w-full text-xs text-white/45">
                                Drop technologies here
                              </p>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#05090f] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Preview
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Tech Stack
                  </h4>

                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-white/5 p-4 pr-3">
                    {previewMarkdown ? (
                      <ReadmeRenderer readme={previewMarkdown} compact />
                    ) : (
                      <div className="text-sm text-white/65">
                        No technologies selected yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p
                  className={`text-sm ${
                    FEEDBACK_CLASS_MAP[feedback?.type] || "text-white/65"
                  }`}
                >
                  {feedback?.message || ""}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
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
    </div>
  );
}



