"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { buildBioPayload } from "@/app/services/githubData.service";
import {
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  buildTechStackPayload,
  getTechIconUrl,
  inferTechStackDataFromRepos,
  mergeTechStackItems,
  normalizeTechItem,
  normalizeTechStackData,
  searchTechCatalog,
  groupTechStackItems,
} from "@/app/lib/techStackCatalog";

const CATEGORY_FILTERS = [
  { id: "all", label: "All" },
  ...TECH_STACK_CATEGORY_ORDER.map((category) => ({
    id: category,
    label: TECH_STACK_CATEGORY_LABELS[category],
  })),
];

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
        <img
          src={iconSrc}
          alt={item.name}
          width={size}
          height={size}
          className="h-7 w-7 shrink-0 object-contain"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : null}
      <span className="text-xs text-white/85">{item.name}</span>
    </div>
  );
}

export default function TechStackVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const { data: session, status } = useSession();

  const [variant, setVariant] = useState("categorized");
  const [theme, setTheme] = useState("midnight");
  const [items, setItems] = useState([]);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [isScanning, setIsScanning] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!open) return;

    const normalized = normalizeTechStackData(initialData, {
      includeDefaults: isStackDataEmpty(initialData),
    });

    setVariant(normalized.variant || "categorized");
    setTheme(normalized.theme || "midnight");
    setItems(normalized.items || []);
    setQuery("");
    setActiveCategory("all");
    setIsScanning(false);
    setFeedback(null);
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

  const addCatalogItem = (entry) => {
    if (!entry) return;

    const alreadyExists = items.some((item) => item.id === entry.id);
    if (alreadyExists) {
      setFeedback({
        type: "info",
        message: `${entry.name} is already included.`,
      });
      return;
    }

    setItems((prev) =>
      mergeTechStackItems(prev, [
        {
          id: entry.id,
          name: entry.name,
          category: entry.category,
          iconId: entry.iconId,
          custom: false,
        },
      ])
    );
  };

  const addCustomItem = () => {
    const trimmed = String(query || "").trim();
    if (!trimmed) return;

    const customCategory =
      activeCategory === "all" ? "frameworks" : activeCategory;
    const customItem = normalizeTechItem(
      {
        name: trimmed,
        category: customCategory,
      },
      customCategory
    );

    if (!customItem) return;

    setItems((prev) => mergeTechStackItems(prev, [customItem]));
    setQuery("");
    setFeedback({
      type: "success",
      message: `Added custom technology "${trimmed}".`,
    });
  };

  const updateItemAt = (index, nextValue) => {
    setItems((prev) => {
      const next = [...prev];
      const current = next[index];
      if (!current) return prev;

      const fallbackCategory = nextValue?.category || current.category;
      const normalized = normalizeTechItem(
        { ...current, ...nextValue },
        fallbackCategory
      );

      if (!normalized) {
        next.splice(index, 1);
      } else {
        next[index] = normalized;
      }

      return mergeTechStackItems(next, []);
    });
  };

  const removeItemAt = (index) => {
    setItems((prev) => prev.filter((_, cursor) => cursor !== index));
  };

  const handleAnalyzeRepositories = async () => {
    if (isScanning) return;

    if (status === "loading") {
      setFeedback({
        type: "info",
        message: "Session is still loading. Try again in a moment.",
      });
      return;
    }

    if (!session?.username && !session?.accessToken) {
      setFeedback({
        type: "error",
        message: "Sign in with GitHub to scan repositories.",
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
        username: session?.username || "",
        token: session?.accessToken,
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
      theme,
      items,
    });

    onSave(payload);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="h-full w-full p-3 sm:p-5">
        <div className="flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b0f14]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-white/40">
                Edit Mode
              </p>
              <h3 className="mt-1 text-xl font-semibold text-white">
                Tech Stack Variant Picker
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Scan repositories, then fine-tune technologies with add, edit, and delete.
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
                value={theme}
                onChange={(event) => setTheme(event.target.value)}
                className="rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="midnight">Midnight</option>
                <option value="aurora">Aurora</option>
                <option value="ember">Ember</option>
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
            <div className="border-b border-white/10 p-4 xl:border-b-0 xl:border-r">
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

                <button
                  onClick={addCustomItem}
                  disabled={!String(query || "").trim()}
                  className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Add custom: {String(query || "").trim() || "technology"}
                </button>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {catalogResults.map((entry) => {
                      const isAdded = items.some((item) => item.id === entry.id);
                      return (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 p-2"
                        >
                          <TechIcon item={entry} />
                          <div className="flex items-center gap-2">
                            <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-white/45 sm:inline-flex">
                              {TECH_STACK_CATEGORY_LABELS[entry.category]}
                            </span>
                            <button
                              onClick={() => addCatalogItem(entry)}
                              className={`rounded-lg px-2 py-1 text-xs font-medium ${
                                isAdded
                                  ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                                  : "border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                              }`}
                            >
                              {isAdded ? "Added" : "Add"}
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
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                <div className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#05090f] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Preview
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Tech Stack
                  </h4>

                  <div className="mt-5 space-y-7">
                    {TECH_STACK_CATEGORY_ORDER.map((category) => {
                      const categoryItems = groupedItems[category] || [];
                      if (!categoryItems.length) return null;

                      return (
                        <div key={`preview-${category}`}>
                          <p className="mb-3 text-sm font-semibold text-white/90">
                            {TECH_STACK_CATEGORY_LABELS[category]}:
                          </p>
                          <div className="flex flex-wrap gap-3">
                            {categoryItems.map((item) => (
                              <div
                                key={`${category}-${item.id}-${item.name}`}
                                className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                                title={item.name}
                              >
                                <img
                                  src={getTechIconUrl(item)}
                                  alt={item.name}
                                  width={34}
                                  height={34}
                                  className="h-8 w-8 object-contain"
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {!items.length ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                        No technologies selected yet.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto rounded-2xl border border-white/10 bg-[#0d131d] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Technologies
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Add, Edit, Delete
                  </h4>

                  <div className="mt-4 space-y-3">
                    {items.map((item, index) => (
                      <div
                        key={`${item.id}-${index}`}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[auto_minmax(0,1fr)_200px_auto]">
                          <div className="flex items-center justify-start">
                            <img
                              src={getTechIconUrl(item)}
                              alt={item.name}
                              width={34}
                              height={34}
                              className="h-8 w-8 object-contain"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          </div>

                          <input
                            value={item.name}
                            onChange={(event) =>
                              updateItemAt(index, { name: event.target.value })
                            }
                            placeholder="Technology name"
                            className="w-full rounded-lg border border-white/15 bg-[#101725] px-3 py-2 text-sm text-white focus:outline-none"
                          />

                          <select
                            value={item.category}
                            onChange={(event) =>
                              updateItemAt(index, { category: event.target.value })
                            }
                            className="w-full rounded-lg border border-white/15 bg-[#101725] px-3 py-2 text-sm text-white focus:outline-none"
                          >
                            {TECH_STACK_CATEGORY_ORDER.map((category) => (
                              <option key={`${item.id}-${category}`} value={category}>
                                {TECH_STACK_CATEGORY_LABELS[category]}
                              </option>
                            ))}
                          </select>

                          <button
                            onClick={() => removeItemAt(index)}
                            className="rounded-lg border border-red-500/45 bg-red-500/15 px-3 py-2 text-sm text-red-200 hover:bg-red-500/25"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
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
