"use client";

import SafeImage from "@/app/components/seo/SafeImage";
import { buildRenderUrl } from "@/app/lib/generateBlockSvg";

export default function RenderHeaderPreview({
  variant,
  name,
  subtitle,
  accents,
  theme,
  compact = false,
}) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const src = buildRenderUrl({
    baseUrl,
    type: "header",
    variant,
    params: {
      name: name || "Your Name",
      subtitle: subtitle || "Building thoughtful software",
      theme: theme || "midnight",
      a: accents || ["Open Source", "Design Systems"],
    },
  });

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-[#0f1115] p-1 ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <SafeImage
        src={src}
        alt="Header preview"
        width={1200}
        height={240}
        className={`block w-full ${compact ? "h-full object-contain" : "h-auto"}`}
        sizes="100vw"
      />
    </div>
  );
}

