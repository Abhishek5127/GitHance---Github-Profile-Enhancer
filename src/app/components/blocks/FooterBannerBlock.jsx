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
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0f1115]">
      <div className="relative">
        <SafeImage
          src={banner.image}
          alt={banner.alt}
          width={1280}
          height={360}
          className="h-auto w-full object-cover"
          sizes="(min-width: 1024px) 640px, 100vw"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
              Footer Banner
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{banner.title}</p>
          </div>
          <span className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">
            README Asset
          </span>
        </div>
      </div>
    </div>
  );
}
