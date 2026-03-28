import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SignatureHeaderPreview from "../previews/headers/SignatureHeaderPreview";
import AchievementHeaderPreview from "../previews/headers/AchievementHeaderPreview";
import TrophyHeaderPreview from "../previews/headers/TrophyHeaderPreview";
import RenderHeaderPreview from "../previews/headers/RenderHeaderPreview";

const RENDER_HEADER_VARIANTS = [
  "constellation",
  "signal",
  "terminal",
  "stacked",
  "circuit",
  "blueprint",
  "spotlight",
  "executive",
  "briefing",
  "glass",
  "ledger",
  "summit",
  "marquee",
  "panorama",
];

function SimpleBadgeHeader({ item, compact = false }) {
  const heading = item.data?.text || "Hi, I'm Your Name";
  const subheading = item.data?.subText || "Building delightful products";
  const headingColor = item.data?.color || "#ffffff";
  const subheadingColor = item.data?.subcolor || "#373d35";

  return (
    <div
      className={`rounded-xl border border-white/10 bg-[#0f1115] p-1.5 ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <div className={`flex flex-col gap-2 ${compact ? "h-full justify-center" : ""}`}>
        <span
          className="inline-block w-fit rounded px-3 py-1 text-sm font-semibold text-black"
          style={{ backgroundColor: headingColor }}
        >
          {heading}
        </span>
        <span
          className="inline-block w-fit rounded px-3 py-1 text-xs text-black"
          style={{ backgroundColor: subheadingColor }}
        >
          {subheading}
        </span>
      </div>
    </div>
  );
}

function LegacyTypingHeaderPreview({ compact = false }) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-[linear-gradient(135deg,#101723,#0a0f18)] p-4 text-white ${
        compact ? "h-[190px]" : ""
      }`}
    >
      <div className="flex h-full flex-col justify-center gap-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/70">Legacy Typing Header</p>
        <p className="text-lg font-semibold text-white">Animated typing banner</p>
        <p className="text-sm text-white/65">
          Existing typing headers stay render-safe here, and markdown export still uses the live typing SVG.
        </p>
      </div>
    </div>
  );
}

export default function HeaderBlock({ item }) {
  const { variant } = item;

  if (variant === "image") {
    return (
      <div className="overflow-hidden rounded-xl border border-white/10">
        <ImageHeaderPreview name={item.data?.customName || "Your Name"} compact />
      </div>
    );
  }

  if (variant === "simple") {
    return <SimpleBadgeHeader item={item} compact />;
  }

  if (variant === "signature") {
    return (
      <SignatureHeaderPreview
        name={item.data?.signatureName}
        role={item.data?.signatureRole}
        theme={item.data?.signatureTheme}
        compact
      />
    );
  }

  if (variant === "achievement") {
    return (
      <AchievementHeaderPreview
        name={item.data?.achievementName}
        role={item.data?.achievementRole}
        achievements={item.data?.achievementList}
        accent={item.data?.achievementAccent}
        compact
      />
    );
  }

  if (variant === "trophy") {
    return (
      <TrophyHeaderPreview
        title={item.data?.trophyTitle}
        achievements={item.data?.trophyList}
        theme={item.data?.trophyTheme}
        columns={item.data?.trophyColumns}
        compact
      />
    );
  }

  if (RENDER_HEADER_VARIANTS.includes(variant)) {
    return (
      <RenderHeaderPreview
        variant={variant}
        name={item.data?.customName}
        subtitle={item.data?.customSubtitle}
        accents={item.data?.customAccents}
        theme={item.data?.customTheme}
        compact
      />
    );
  }

  if (variant === "typingHeader") {
    return <LegacyTypingHeaderPreview compact />;
  }

  return null;
}
