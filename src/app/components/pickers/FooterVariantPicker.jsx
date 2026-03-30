"use client";

import { useMemo, useState } from "react";
import SafeImage from "@/app/components/seo/SafeImage";
import {
  FOOTER_BANNER_ITEMS,
  getFooterBannerById,
  normalizeFooterBannerId,
} from "@/app/lib/footerBannerCatalog";

export default function FooterVariantPicker({
  open,
  onClose,
  onSave,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const initialBannerId = normalizeFooterBannerId(initialData?.bannerId);
  const [selectedBannerId, setSelectedBannerId] = useState(initialBannerId);

  const selectedBanner = useMemo(
    () => getFooterBannerById(selectedBannerId),
    [selectedBannerId]
  );

  const handleClose = () => {
    setSelectedBannerId(initialBannerId);
    onClose();
  };

  const handleSubmit = async () => {
    await onSave({
      bannerId: normalizeFooterBannerId(selectedBannerId),
    });
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:inset-y-0 lg:left-72 lg:right-0">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0d1117] p-3 sm:p-4 lg:w-[680px] lg:border-r lg:border-white/10">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">
              Footer Banner
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Choose Footer Style</h3>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Live Preview</p>
            <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1118]">
              {selectedBanner ? (
                <div className="relative h-24 w-full sm:h-28">
                  <SafeImage
                    src={selectedBanner.image}
                    alt={selectedBanner.alt}
                    width={1280}
                    height={360}
                    className="h-full w-full object-cover object-center"
                    sizes="(min-width: 1024px) 640px, 100vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/48 via-black/12 to-black/38" />
                </div>
              ) : null}
            </div>
            <p className="mt-3 text-xs leading-5 text-white/60">
              On publish, this banner will be added to your repo under `assets/readme/` and linked from the generated README markdown.
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FOOTER_BANNER_ITEMS.map((banner) => {
              const selected = selectedBannerId === banner.id;
              return (
                <button
                  key={banner.id}
                  type="button"
                  onClick={() => setSelectedBannerId(banner.id)}
                  className={`overflow-hidden rounded-2xl border text-left transition ${
                    selected
                      ? "border-[#ffb37f] bg-[#1a1310] shadow-[0_0_0_1px_rgba(255,179,127,0.2)]"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  }`}
                >
                  <div className="relative h-20 w-full sm:h-24">
                    <SafeImage
                      src={banner.image}
                      alt={banner.alt}
                      width={720}
                      height={240}
                      className="h-full w-full object-cover object-center"
                      sizes="(min-width: 1024px) 280px, 100vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/68 via-black/24 to-black/50" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{banner.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
                        .{banner.extension}
                      </p>
                    </div>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected
                          ? "border-[#ffb37f] bg-[#ff7a1a] text-black"
                          : "border-white/20 bg-transparent text-transparent"
                      }`}
                    >
                      <svg
                        viewBox="0 0 16 16"
                        className="h-3 w-3 fill-none stroke-current"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                      </svg>
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
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
            className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

