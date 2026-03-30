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
        <div className="absolute inset-0 bg-gradient-to-r from-black/48 via-black/12 to-black/38" />
      </div>
    </div>
  );
}
