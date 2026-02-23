"use client";

export default function AchievementHeaderPreview({
  name,
  role,
  achievements,
  accent,
  compact = false,
}) {
  const safeName = name || "Your Name";
  const safeRole = role || "Building thoughtful software";
  const safeAchievements = (achievements || [])
    .filter(Boolean)
    .map((text) => encodeURIComponent(text));

  const accentColor = (accent || "ff7a1a").replace("#", "");
  const lines = [safeName, safeRole, ...safeAchievements].filter(Boolean).join(";");

  const src = `https://readme-typing-svg.demolab.com/?lines=${lines}&font=Fira%20Code&center=true&width=700&height=50&color=${accentColor}&vCenter=true&pause=900&size=28`;

  return (
    <div
      className={`overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1 ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <div className={`overflow-hidden rounded-lg border border-white/10 bg-[#0f1115] p-1 ${compact ? "h-full" : ""}`}>
        <img
          src={src}
          alt="Achievements header"
          className={`block w-full ${compact ? "h-full object-contain" : ""}`}
        />
      </div>
    </div>
  );
}
