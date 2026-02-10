"use client";

export default function SignatureHeaderPreview({ name, role, theme }) {
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
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <img
        src={src}
        alt="Header preview"
        className="w-full rounded-xl"
      />
    </div>
  );
}
