"use client";

import SafeImage from "@/app/components/seo/SafeImage";
import { getFooterBannerById } from "@/app/lib/footerBannerCatalog";

export default function FooterBannerBlock({ item }) {
  const banner = getFooterBannerById(item?.data?.bannerId);

  if (!banner) {
    return (
      <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4 text-sm text-white/60">
        Choose a footer banner to preview it here.
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0f1115]">
      <div className="relative h-24 w-full sm:h-28">
        <SafeImage
          src={banner.image}
          alt={banner.alt}
          width={1280}
          height={360}
          className="h-full w-full object-cover object-center"
          sizes="(min-width: 1024px) 640px, 100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/72 via-black/32 to-black/55" />
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Footer Banner
            </p>
            <p className="mt-1 truncate text-sm font-semibold text-white">{banner.title}</p>
          </div>
          <span className="shrink-0 rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
            README Asset
          </span>
        </div>
      </div>
    </div>
  );
}
