/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import { buildSocialLinksMarkdownSection } from "@/app/lib/genrateMarkdown";
import {
  SOCIAL_LINK_ALIGNMENTS,
  SOCIAL_LINK_LAYOUTS,
  buildSocialLinksPayload,
  getSocialPlatformById,
  normalizeSocialLinksData,
  normalizeSocialUrl,
  searchSocialPlatforms,
} from "@/app/lib/socialLinksCatalog";

const ALIGNMENT_OPTIONS = SOCIAL_LINK_ALIGNMENTS.map((alignment) => ({
  id: alignment,
  label: alignment.charAt(0).toUpperCase() + alignment.slice(1),
}));

const LAYOUT_OPTIONS = SOCIAL_LINK_LAYOUTS.map((layout) => ({
  id: layout,
  label: layout === "grid" ? "Square Grid" : "Straight Row",
}));

const FEEDBACK_CLASS_MAP = {
  success: "text-emerald-300",
  info: "text-cyan-300",
  error: "text-red-300",
};

function SocialPlatformIcon({ platform, size = 22, className = "", darkSurface = false }) {
  const iconSrc = darkSurface ? platform?.darkIconUrl || platform?.iconUrl : platform?.iconUrl;
  if (!iconSrc) {
    return null;
  }

  return (
    <img
      src={iconSrc}
      alt={platform.label}
      width={size}
      height={size}
      loading="lazy"
      className={className}
    />
  );
}

export default function SocialLinksVariantPicker({
  open,
  onClose,
  onSave,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const initialSnapshot = normalizeSocialLinksData(initialData, {
    includeDefaults: true,
  });
  const [title, setTitle] = useState(() => initialSnapshot.title || "Connect With Me");
  const [alignment, setAlignment] = useState(() => initialSnapshot.alignment || "center");
  const [layout, setLayout] = useState(() => initialSnapshot.layout || "straight");
  const [items, setItems] = useState(() => initialSnapshot.items || []);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

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

  const catalogResults = useMemo(
    () => searchSocialPlatforms(query, { limit: 48 }),
    [query]
  );

  const selectedIds = useMemo(
    () => new Set(items.map((entry) => entry.platformId)),
    [items]
  );

  const previewMarkdown = useMemo(
    () =>
      buildSocialLinksMarkdownSection(
        {
          title,
          alignment,
          layout,
          items,
        },
        { includeHeading: true, darkSurface: true }
      ),
    [title, alignment, layout, items]
  );

  const handleClose = () => {
    setTitle(initialSnapshot.title || "Connect With Me");
    setAlignment(initialSnapshot.alignment || "center");
    setLayout(initialSnapshot.layout || "straight");
    setItems(initialSnapshot.items || []);
    setQuery("");
    setFeedback(null);
    onClose();
  };

  const addPlatform = (platformId) => {
    const platform = getSocialPlatformById(platformId);
    if (!platform?.id) return;

    setItems((prev) => {
      if (prev.some((entry) => entry.platformId === platform.id)) {
        return prev;
      }

      return [...prev, { platformId: platform.id, url: "" }];
    });
    setFeedback({
      type: "info",
      message: `Added ${platform.label}. Paste your profile URL to make it clickable.`,
    });
  };

  const removePlatform = (platformId) => {
    const platform = getSocialPlatformById(platformId);
    setItems((prev) => prev.filter((entry) => entry.platformId !== platformId));
    setFeedback({
      type: "success",
      message: platform?.label ? `${platform.label} removed.` : "Link removed.",
    });
  };

  const updateItemUrl = (platformId, nextValue) => {
    setItems((prev) =>
      prev.map((entry) =>
        entry.platformId === platformId
          ? { ...entry, url: nextValue }
          : entry
      )
    );
  };

  const normalizeItemUrl = (platformId) => {
    setItems((prev) =>
      prev.map((entry) =>
        entry.platformId === platformId
          ? { ...entry, url: normalizeSocialUrl(entry.url, platformId) }
          : entry
      )
    );
  };

  const handleSubmit = async () => {
    const payload = buildSocialLinksPayload({
      title,
      alignment,
      layout,
      items,
    });
    const hasValidLink = payload.items.some((entry) => Boolean(entry.url));

    if (!hasValidLink) {
      setFeedback({
        type: "error",
        message: "Add at least one profile URL to publish a social links block.",
      });
      return;
    }

    await onSave(payload);
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
                Social Links Picker
              </h3>
              <p className="mt-1 text-sm text-white/60">
                Pick platforms, paste your profile URLs, and choose whether GitHub renders them in a straight row or a square grid.
              </p>
            </div>

            <button
              onClick={handleClose}
              className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/75 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="min-h-[320px] border-b border-white/10 p-4 xl:min-h-0 xl:border-b-0 xl:border-r">
              <div className="flex h-full min-h-0 flex-col gap-3">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search social platforms..."
                  className="w-full rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
                />

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-2">
                    {catalogResults.map((platform) => {
                      const isAdded = selectedIds.has(platform.id);
                      return (
                        <div
                          key={platform.id}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 ${
                            isAdded
                              ? "border-emerald-500/35 bg-emerald-500/10"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#111824]">
                              <SocialPlatformIcon
                                platform={platform}
                                size={22}
                                className="h-5 w-5 object-contain"
                                darkSurface
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-white">
                                {platform.label}
                              </p>
                              <p className="truncate text-xs text-white/45">
                                {platform.placeholder}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => addPlatform(platform.id)}
                            disabled={isAdded}
                            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                              isAdded
                                ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
                                : "border border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                            }`}
                          >
                            {isAdded ? "Added" : "Add"}
                          </button>
                        </div>
                      );
                    })}

                    {!catalogResults.length ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                        No platforms matched your search.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex min-h-0 flex-col p-4">
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#0d131d] p-4">
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                        Section Title
                      </span>
                      <input
                        value={title}
                        onChange={(event) => setTitle(event.target.value)}
                        placeholder="Connect With Me"
                        className="mt-2 w-full rounded-xl border border-white/15 bg-[#111824] px-4 py-3 text-base font-medium text-white focus:outline-none"
                      />
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                        <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                          Structure
                        </span>
                        <select
                          value={layout}
                          onChange={(event) => setLayout(event.target.value)}
                          className="mt-2 w-full rounded-xl border border-white/15 bg-[#111824] px-3 py-3 text-sm text-white focus:outline-none"
                        >
                          {LAYOUT_OPTIONS.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {items.map((entry) => {
                      const platform = getSocialPlatformById(entry.platformId);
                      if (!platform) return null;

                      return (
                        <div
                          key={platform.id}
                          className="rounded-2xl border border-white/10 bg-white/5 p-3"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#111824]">
                                <SocialPlatformIcon
                                  platform={platform}
                                  size={22}
                                  className="h-5 w-5 object-contain"
                                  darkSurface
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-white">
                                  {platform.label}
                                </p>
                                <p className="truncate text-xs text-white/45">
                                  {platform.placeholder}
                                </p>
                              </div>
                            </div>

                            <button
                              onClick={() => removePlatform(platform.id)}
                              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/25"
                            >
                              Remove
                            </button>
                          </div>

                          <input
                            value={entry.url}
                            onChange={(event) => updateItemUrl(platform.id, event.target.value)}
                            onBlur={() => normalizeItemUrl(platform.id)}
                            placeholder={platform.placeholder}
                            className="mt-3 w-full rounded-xl border border-white/15 bg-[#111824] px-3 py-2 text-sm text-white focus:outline-none"
                          />
                        </div>
                      );
                    })}

                    {!items.length ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
                        No platforms selected yet. Add one from the left panel to start building your social section.
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-[#05090f] p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                    Preview
                  </p>
                  <h4 className="mt-2 text-lg font-semibold text-white">
                    Social Links
                  </h4>

                  <div className="mt-5 min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4 pr-3">
                    {previewMarkdown ? (
                      <ReadmeRenderer readme={previewMarkdown} compact />
                    ) : (
                      <div className="text-sm text-white/65">
                        Add at least one valid URL to preview your clickable icons.
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
    </div>
  );
}




