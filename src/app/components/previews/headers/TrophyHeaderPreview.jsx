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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="rounded-xl border border-white/10 bg-[#0f1115] p-4">
        <img src={src} alt="Achievements showcase" className="w-full" />
      </div>
    </div>
  );
}