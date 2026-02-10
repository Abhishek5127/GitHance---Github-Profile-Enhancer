import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SimpleHeaderPreview from "../previews/headers/SimpleHeaderPreview";
import SignatureHeaderPreview from "../previews/headers/SignatureHeaderPreview";
import AchievementHeaderPreview from "../previews/headers/AchievementHeaderPreview";
import TrophyHeaderPreview from "../previews/headers/TrophyHeaderPreview";
import { buildRenderUrl } from "@/app/lib/generateBlockSvg";

export default function HeaderBlock({ item, setItems }) {
  const { variant } = item;

  const updateHeaderField = (field, value) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, data: { ...i.data, [field]: value } }
          : i
      )
    );
  };

  const renderCustomHeader = (currentVariant) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const previewSrc = buildRenderUrl({
      baseUrl,
      type: "header",
      variant: currentVariant,
      params: {
        name: item.data?.customName || "Your Name",
        subtitle: item.data?.customSubtitle || "Building thoughtful software",
        theme: item.data?.customTheme || "midnight",
        a: item.data?.customAccents || [],
      },
    });

    return (
      <div className="flex w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <input
              value={item.data?.customName}
              onChange={(e) => updateHeaderField("customName", e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <input
              value={item.data?.customSubtitle}
              onChange={(e) => updateHeaderField("customSubtitle", e.target.value)}
              placeholder="Short tagline"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {(item.data?.customAccents || ["Open Source", "Design Systems"]).map((text, index) => (
                <input
                  key={index}
                  value={text}
                  onChange={(e) => {
                    const next = [...(item.data?.customAccents || [])];
                    next[index] = e.target.value;
                    updateHeaderField("customAccents", next);
                  }}
                  placeholder={`Accent ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-xs text-white focus:outline-none"
                />
              ))}
            </div>
            <select
              value={item.data?.customTheme || "midnight"}
              onChange={(e) => updateHeaderField("customTheme", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="midnight">Midnight</option>
              <option value="aurora">Aurora</option>
              <option value="ember">Ember</option>
            </select>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0f1115] p-3">
            <img src={previewSrc} alt="Header preview" className="w-full" />
          </div>
        </div>
      </div>
    );
  };

  if (variant === "image") {
    return (
      <div className="rounded overflow-hidden border border-white/10">
        <ImageHeaderPreview />
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <div className="flex">
        <SimpleHeaderPreview
          textInput={item.data.text}
          subTextInput={item.data.subText}
          setTextInput={(val) => updateHeaderField("text", val)}
          setSubTextInput={(val) => updateHeaderField("subText", val)}
          color={item.data.color}
          subcolor={item.data.subcolor}
          setColor={(val) => updateHeaderField("color", val)}
          setSubColor={(val) => updateHeaderField("subcolor", val)}
        />
      </div>
    );
  }

  if (variant === "signature") {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <input
              value={item.data.signatureName}
              onChange={(e) => updateHeaderField("signatureName", e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <input
              value={item.data.signatureRole}
              onChange={(e) => updateHeaderField("signatureRole", e.target.value)}
              placeholder="Short tagline"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <select
              value={item.data.signatureTheme}
              onChange={(e) => updateHeaderField("signatureTheme", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="gradient">Gradient</option>
              <option value="orange">Orange</option>
              <option value="purple">Purple</option>
              <option value="cyan">Cyan</option>
              <option value="black">Dark</option>
            </select>
          </div>
          <SignatureHeaderPreview
            name={item.data.signatureName}
            role={item.data.signatureRole}
            theme={item.data.signatureTheme}
          />
        </div>
      </div>
    );
  }

  if (variant === "achievement") {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <input
              value={item.data.achievementName}
              onChange={(e) => updateHeaderField("achievementName", e.target.value)}
              placeholder="Your Name"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <input
              value={item.data.achievementRole}
              onChange={(e) => updateHeaderField("achievementRole", e.target.value)}
              placeholder="Short tagline"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <input
              value={item.data.achievementAccent}
              onChange={(e) => updateHeaderField("achievementAccent", e.target.value)}
              placeholder="#ff7a1a"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <div className="space-y-2">
              {(item.data.achievementList || []).map((text, index) => (
                <input
                  key={index}
                  value={text}
                  onChange={(e) => {
                    const next = [...item.data.achievementList];
                    next[index] = e.target.value;
                    updateHeaderField("achievementList", next);
                  }}
                  placeholder={`Achievement ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
                />
              ))}
            </div>
          </div>
          <AchievementHeaderPreview
            name={item.data.achievementName}
            role={item.data.achievementRole}
            achievements={item.data.achievementList}
            accent={item.data.achievementAccent}
          />
        </div>
      </div>
    );
  }

  if (variant === "trophy") {
    return (
      <div className="flex w-full flex-col gap-4">
        <div className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-2">
            <input
              value={item.data.trophyTitle}
              onChange={(e) => updateHeaderField("trophyTitle", e.target.value)}
              placeholder="Highlights"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <select
              value={item.data.trophyTheme}
              onChange={(e) => updateHeaderField("trophyTheme", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="midnight">Midnight</option>
              <option value="aurora">Aurora</option>
              <option value="ember">Ember</option>
            </select>
            <select
              value={item.data.trophyColumns}
              onChange={(e) => updateHeaderField("trophyColumns", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            >
              <option value="3">3 columns</option>
              <option value="4">4 columns</option>
              <option value="5">5 columns</option>
            </select>
            <div className="space-y-2">
              {(item.data.trophyList || []).map((text, index) => (
                <input
                  key={index}
                  value={text}
                  onChange={(e) => {
                    const next = [...item.data.trophyList];
                    next[index] = e.target.value;
                    updateHeaderField("trophyList", next);
                  }}
                  placeholder={`Achievement ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
                />
              ))}
            </div>
          </div>
          <TrophyHeaderPreview
            title={item.data.trophyTitle}
            achievements={item.data.trophyList}
            theme={item.data.trophyTheme}
            columns={item.data.trophyColumns}
          />
        </div>
      </div>
    );
  }

  if (["constellation", "signal", "terminal", "stacked"].includes(variant)) {
    return renderCustomHeader(variant);
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