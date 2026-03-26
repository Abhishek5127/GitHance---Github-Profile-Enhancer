"use client";

import SafeImage from "@/app/components/seo/SafeImage";
import { buildTrophyUrl } from "@/app/lib/generateTrophySvg";

export default function TrophyHeaderPreview({
  title,
  achievements,
  theme,
  columns,
  compact = false,
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const src = buildTrophyUrl({
    baseUrl,
    title: title || "Highlights",
    achievements: achievements || [],
    theme: theme || "midnight",
    columns: columns || 4,
  });

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <div className={`overflow-hidden rounded-lg border border-white/10 bg-[#0f1115] p-1 ${compact ? "h-full" : ""}`}>
        <SafeImage
          src={src}
          alt="Achievements showcase"
          width={900}
          height={240}
          className={`block w-full ${compact ? "h-full object-contain" : "h-auto"}`}
          sizes="100vw"
        />
      </div>
    </div>
  );
}

