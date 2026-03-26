"use client";

import SafeImage from "@/app/components/seo/SafeImage";

export default function SignatureHeaderPreview({ name, role, theme, compact = false }) {
  const safeName = name || "Your Name";
  const safeRole = role || "Building thoughtful software";
  const safeTheme = theme || "gradient";

  const src = `https://capsule-render.vercel.app/api?type=waving&color=${encodeURIComponent(
    safeTheme
  )}&height=160&section=header&text=${encodeURIComponent(
    safeName
  )}&fontSize=38&fontAlignY=35&desc=${encodeURIComponent(
    safeRole
  )}&descAlignY=60`;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <SafeImage
        src={src}
        alt="Header preview"
        width={1200}
        height={160}
        className={`block w-full ${compact ? "h-full object-contain" : "h-auto"}`}
        sizes="100vw"
      />
    </div>
  );
}

