"use client";

import { buildTrophyUrl } from "@/app/lib/generateTrophySvg";

export default function TrophyHeaderPreview({ title, achievements, theme, columns }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const src = buildTrophyUrl({
    baseUrl,
    title: title || "Highlights",
    achievements: achievements || [],
    theme: theme || "midnight",
    columns: columns || 4,
  });

  return (
    <div className="overflow-hidden border border-white/10 bg-white/5 p-1">
      <div className="overflow-hidden border border-white/10 bg-[#0f1115] p-1">
        <img src={src} alt="Achievements showcase" className="block w-full" />
      </div>
    </div>
  );
}
