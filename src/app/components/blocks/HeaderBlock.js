import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SignatureHeaderPreview from "../previews/headers/SignatureHeaderPreview";
import AchievementHeaderPreview from "../previews/headers/AchievementHeaderPreview";
import TrophyHeaderPreview from "../previews/headers/TrophyHeaderPreview";
import RenderHeaderPreview from "../previews/headers/RenderHeaderPreview";

function SimpleBadgeHeader({ item }) {
  const heading = item.data?.text || "Hi, I'm Your Name";
  const subheading = item.data?.subText || "Building delightful products";
  const headingColor = item.data?.color || "#ffffff";
  const subheadingColor = item.data?.subcolor || "#373d35";

  return (
    <div className="border border-white/10 bg-[#0f1115] p-2">
      <div className="flex flex-col gap-2">
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

export default function HeaderBlock({ item }) {
  const { variant } = item;

  if (variant === "image") {
    return (
      <div className="overflow-hidden border border-white/10">
        <ImageHeaderPreview name={item.data?.customName || "Your Name"} />
      </div>
    );
  }

  if (variant === "simple") {
    return <SimpleBadgeHeader item={item} />;
  }

  if (variant === "signature") {
    return (
      <SignatureHeaderPreview
        name={item.data?.signatureName}
        role={item.data?.signatureRole}
        theme={item.data?.signatureTheme}
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
      />
    );
  }

  if (["constellation", "signal", "terminal", "stacked"].includes(variant)) {
    return (
      <RenderHeaderPreview
        variant={variant}
        name={item.data?.customName}
        subtitle={item.data?.customSubtitle}
        accents={item.data?.customAccents}
        theme={item.data?.customTheme}
      />
    );
  }

  if (variant === "typingHeader") {
    return (
      <div className="text-white">
        <TypingHeaderPreview />
      </div>
    );
  }

  return null;
}
