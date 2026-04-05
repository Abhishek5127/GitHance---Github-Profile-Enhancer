"use client";

import { useMemo, useState } from "react";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SignatureHeaderPreview from "../previews/headers/SignatureHeaderPreview";
import AchievementHeaderPreview from "../previews/headers/AchievementHeaderPreview";
import TrophyHeaderPreview from "../previews/headers/TrophyHeaderPreview";
import RenderHeaderPreview from "../previews/headers/RenderHeaderPreview";

const HEADER_DEFAULTS = {
  color: "#ffffff",
  subcolor: "#373d35",
  text: "Hi, I'm Your Name",
  subText: "Building delightful products",
  bannerUrl: "/headers/DragonBannerHeader.png",
  signatureName: "Your Name",
  signatureRole: "Design + Code",
  signatureTheme: "gradient",
  achievementName: "Your Name",
  achievementRole: "Creative Developer",
  achievementAccent: "#ff7a1a",
  achievementList: ["Top 1% GitHub", "Open Source Mentor", "Featured Project"],
  trophyTitle: "Highlights",
  trophyTheme: "midnight",
  trophyColumns: 4,
  trophyList: ["OSS Maintainer", "Top 1% GitHub", "Speaker"],
  customName: "Your Name",
  customSubtitle: "Building thoughtful software",
  customAccents: ["Open Source", "Design Systems"],
  customTheme: "midnight",
};

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

const VISIBLE_VARIANTS = [
  { id: "simple", title: "Badge Header" },
  { id: "signature", title: "Signature Banner" },
  { id: "achievement", title: "Achievement Flow" },
  { id: "constellation", title: "Constellation" },
  { id: "signal", title: "Signal Wave" },
  { id: "terminal", title: "Terminal" },
  { id: "stacked", title: "Stacked Panels" },
  { id: "circuit", title: "Circuit Trace" },
  { id: "blueprint", title: "Blueprint Grid" },
  { id: "spotlight", title: "Spotlight Halo" },
  { id: "executive", title: "Executive Panel" },
  { id: "briefing", title: "Briefing Deck" },
  { id: "glass", title: "Glass Board" },
];

const HIDDEN_VARIANTS = [
  { id: "typingHeader", title: "Typing Header" },
  { id: "image", title: "Image Banner" },
  { id: "trophy", title: "Trophy Showcase" },
  { id: "ledger", title: "Ledger Frame" },
  { id: "summit", title: "Summit Line" },
  { id: "marquee", title: "Marquee Tape" },
  { id: "panorama", title: "Panorama Bands" },
];

const ALL_VARIANTS = [...VISIBLE_VARIANTS, ...HIDDEN_VARIANTS];

const normalizeList = (value, fallback = []) => {
  const source = Array.isArray(value) ? value : [];
  const targetLength = Math.max(fallback.length, source.length);

  return Array.from({ length: targetLength }, (_, index) => {
    const nextValue = source[index];

    if (nextValue === undefined || nextValue === null) {
      return fallback[index] ?? "";
    }

    return String(nextValue);
  });
};

const HEADER_ACCENT_PREVIEW_VALUES = [
  "Open Source",
  "Design Systems",
  "AI Workflows",
  "Reliable Delivery",
];

const HEADER_RENDER_ACCENT_SLOT_COUNT = {
  terminal: 2,
  circuit: 3,
  blueprint: 3,
  spotlight: 3,
  executive: 3,
  briefing: 3,
  glass: 3,
  ledger: 3,
  summit: 2,
  marquee: 3,
  panorama: 2,
};

const getRenderAccentSlotCount = (variantId) =>
  HEADER_RENDER_ACCENT_SLOT_COUNT[String(variantId || "").trim().toLowerCase()] || 0;

const buildHeaderAccentFallback = (variantId) =>
  Array.from({ length: getRenderAccentSlotCount(variantId) }, (_, index) =>
    HEADER_DEFAULTS.customAccents[index] ?? ""
  );

const buildHeaderAccentPreviewValues = (variantId) =>
  Array.from({ length: getRenderAccentSlotCount(variantId) }, (_, index) =>
    HEADER_ACCENT_PREVIEW_VALUES[index] ?? `Subtext ${index + 1}`
  );

const createHeaderFormData = (initialData = null, variantId = "") => {
  const nextData = initialData || {};
  const accentFallback = buildHeaderAccentFallback(variantId);

  return {
    ...HEADER_DEFAULTS,
    ...nextData,
    achievementList: normalizeList(nextData.achievementList, HEADER_DEFAULTS.achievementList),
    trophyList: normalizeList(nextData.trophyList, HEADER_DEFAULTS.trophyList),
    customAccents: normalizeList(nextData.customAccents, accentFallback).slice(0, accentFallback.length),
  };
};

function SimpleBadgePreview({ title, subtitle, color, subcolor }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0f1115] p-3">
      <div className="flex flex-col gap-2">
        <span
          className="inline-block w-fit rounded px-3 py-1 text-xs font-semibold text-black"
          style={{ backgroundColor: color || "#ffffff" }}
        >
          {title || "Hi, I'm Your Name"}
        </span>
        <span
          className="inline-block w-fit rounded px-3 py-1 text-[11px] text-black"
          style={{ backgroundColor: subcolor || "#373d35" }}
        >
          {subtitle || "Building delightful products"}
        </span>
      </div>
    </div>
  );
}

export default function HeaderVariantPicker({
  open,
  onClose,
  onSelectVariant,
  initialVariant = null,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const [selectedVariant, setSelectedVariant] = useState(() => initialVariant || null);
  const [formData, setFormData] = useState(() => createHeaderFormData(initialData, initialVariant));

  const selectedMeta = useMemo(
    () => ALL_VARIANTS.find((variant) => variant.id === selectedVariant),
    [selectedVariant]
  );

  const openEditor = (variantId) => {
    setSelectedVariant(variantId);
    setFormData((prev) => createHeaderFormData(prev, variantId));
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateListField = (field, index, value) => {
    const next = [...(formData[field] || [])];
    next[index] = value;
    updateField(field, next);
  };

  const handleAddToCanvas = () => {
    if (!selectedVariant) return;

    const nextVariant = selectedVariant;
    const nextData = createHeaderFormData(formData, nextVariant);

    setSelectedVariant(null);
    setFormData(createHeaderFormData());
    onSelectVariant(nextVariant, nextData);
  };

  const handleClose = () => {
    setSelectedVariant(null);
    setFormData(createHeaderFormData());
    onClose();
  };

  const renderVariantCardPreview = (variantId) => {
    if (variantId === "simple") {
      return (
        <SimpleBadgePreview
          title="Hi, I'm Your Name"
          subtitle="Design + Code"
          color="#ffffff"
          subcolor="#373d35"
        />
      );
    }

    if (variantId === "signature") {
      return (
        <SignatureHeaderPreview
          name="Your Name"
          role="Design + Code"
          theme="gradient"
        />
      );
    }

    if (variantId === "achievement") {
      return (
        <AchievementHeaderPreview
          name="Your Name"
          role="Creative Developer"
          achievements={["Top 1% GitHub", "Open Source Mentor"]}
          accent="#ff7a1a"
        />
      );
    }

    if (variantId === "trophy") {
      return (
        <TrophyHeaderPreview
          title="Highlights"
          achievements={["OSS Maintainer", "Top 1% GitHub", "Speaker"]}
          theme="midnight"
          columns={4}
        />
      );
    }

    if (RENDER_HEADER_VARIANTS.includes(variantId)) {
      return (
        <RenderHeaderPreview
          variant={variantId}
          name="Your Name"
          subtitle="Product Engineer | AI Systems"
          theme="midnight"
          accents={buildHeaderAccentPreviewValues(variantId)}
        />
      );
    }

    if (variantId === "typingHeader") return null;
    if (variantId === "image") return <ImageHeaderPreview name="Your Name" />;
    return null;
  };

  const renderEditorFields = () => {
    if (!selectedVariant) return null;

    if (selectedVariant === "simple") {
      return (
        <div className="space-y-3">
          <input
            value={formData.text || ""}
            onChange={(e) => updateField("text", e.target.value)}
            placeholder="Heading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <input
            value={formData.subText || ""}
            onChange={(e) => updateField("subText", e.target.value)}
            placeholder="Subheading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={formData.color || ""}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="#ffffff"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
            <input
              value={formData.subcolor || ""}
              onChange={(e) => updateField("subcolor", e.target.value)}
              placeholder="#373d35"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        </div>
      );
    }

    if (selectedVariant === "signature") {
      return (
        <div className="space-y-3">
          <input
            value={formData.signatureName || ""}
            onChange={(e) => updateField("signatureName", e.target.value)}
            placeholder="Heading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <input
            value={formData.signatureRole || ""}
            onChange={(e) => updateField("signatureRole", e.target.value)}
            placeholder="Subheading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <select
            value={formData.signatureTheme || "gradient"}
            onChange={(e) => updateField("signatureTheme", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="gradient">Gradient</option>
            <option value="orange">Orange</option>
            <option value="purple">Purple</option>
            <option value="cyan">Cyan</option>
            <option value="black">Dark</option>
          </select>
        </div>
      );
    }

    if (selectedVariant === "achievement") {
      return (
        <div className="space-y-3">
          <input
            value={formData.achievementName || ""}
            onChange={(e) => updateField("achievementName", e.target.value)}
            placeholder="Heading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <input
            value={formData.achievementRole || ""}
            onChange={(e) => updateField("achievementRole", e.target.value)}
            placeholder="Subheading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <input
            value={formData.achievementAccent || ""}
            onChange={(e) => updateField("achievementAccent", e.target.value)}
            placeholder="#ff7a1a"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          {(formData.achievementList || []).map((text, index) => (
            <input
              key={`achievement-${index}`}
              value={text}
              onChange={(e) => updateListField("achievementList", index, e.target.value)}
              placeholder={`Achievement ${index + 1}`}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
          ))}
        </div>
      );
    }

    if (selectedVariant === "trophy") {
      return (
        <div className="space-y-3">
          <input
            value={formData.trophyTitle || ""}
            onChange={(e) => updateField("trophyTitle", e.target.value)}
            placeholder="Heading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <select
            value={formData.trophyTheme || "midnight"}
            onChange={(e) => updateField("trophyTheme", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="midnight">Midnight</option>
            <option value="aurora">Aurora</option>
            <option value="ember">Ember</option>
          </select>
          <select
            value={String(formData.trophyColumns || 4)}
            onChange={(e) => updateField("trophyColumns", Number(e.target.value))}
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="3">3 Columns</option>
            <option value="4">4 Columns</option>
            <option value="5">5 Columns</option>
          </select>
          {(formData.trophyList || []).map((text, index) => (
            <input
              key={`trophy-${index}`}
              value={text}
              onChange={(e) => updateListField("trophyList", index, e.target.value)}
              placeholder={`Badge ${index + 1}`}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
            />
          ))}
        </div>
      );
    }

    if (RENDER_HEADER_VARIANTS.includes(selectedVariant)) {
      const accentInputs = (formData.customAccents || []).slice(
        0,
        getRenderAccentSlotCount(selectedVariant)
      );

      return (
        <div className="space-y-3">
          <input
            value={formData.customName || ""}
            onChange={(e) => updateField("customName", e.target.value)}
            placeholder="Heading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          <input
            value={formData.customSubtitle || ""}
            onChange={(e) => updateField("customSubtitle", e.target.value)}
            placeholder="Subheading"
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          />
          {accentInputs.length ? (
            <div className="grid grid-cols-2 gap-2">
              {accentInputs.map((text, index) => (
                <input
                  key={`accent-${index}`}
                  value={text}
                  onChange={(e) => updateListField("customAccents", index, e.target.value)}
                  placeholder={`Subtext ${index + 1}`}
                  className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
                />
              ))}
            </div>
          ) : null}
          <select
            value={formData.customTheme || "midnight"}
            onChange={(e) => updateField("customTheme", e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option value="midnight">Midnight</option>
            <option value="aurora">Aurora</option>
            <option value="ember">Ember</option>
          </select>
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/70">
        This style currently has no configurable heading/subheading fields.
      </div>
    );
  };

  const renderEditorPreview = () => {
    if (!selectedVariant) return null;

    if (selectedVariant === "simple") {
      return (
        <SimpleBadgePreview
          title={formData.text}
          subtitle={formData.subText}
          color={formData.color}
          subcolor={formData.subcolor}
        />
      );
    }

    if (selectedVariant === "signature") {
      return (
        <SignatureHeaderPreview
          name={formData.signatureName}
          role={formData.signatureRole}
          theme={formData.signatureTheme}
        />
      );
    }

    if (selectedVariant === "achievement") {
      return (
        <AchievementHeaderPreview
          name={formData.achievementName}
          role={formData.achievementRole}
          achievements={formData.achievementList}
          accent={formData.achievementAccent}
        />
      );
    }

    if (selectedVariant === "trophy") {
      return (
        <TrophyHeaderPreview
          title={formData.trophyTitle}
          achievements={formData.trophyList}
          theme={formData.trophyTheme}
          columns={formData.trophyColumns}
        />
      );
    }

    if (RENDER_HEADER_VARIANTS.includes(selectedVariant)) {
      return (
        <RenderHeaderPreview
          variant={selectedVariant}
          name={formData.customName}
          subtitle={formData.customSubtitle}
          accents={formData.customAccents}
          theme={formData.customTheme}
        />
      );
    }

    if (selectedVariant === "typingHeader") return null;
    if (selectedVariant === "image") return <ImageHeaderPreview name={formData.customName} />;
    return null;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm lg:inset-y-0 lg:left-72 lg:right-0"
    >
      <div
        className="relative h-full w-full overflow-hidden bg-[#0d1117] p-3 sm:p-4 lg:w-[820px] lg:border-r lg:border-white/10"
      >
        <div className="h-full overflow-y-auto pr-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Choose Header Style</h3>
            <button onClick={handleClose} className="cursor-pointer text-gray-400 hover:text-white">
              X
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {VISIBLE_VARIANTS.map((variant) => (
              <button
                key={variant.id}
                onClick={() => openEditor(variant.id)}
                className="rounded bg-[#111418] p-4 text-left transition hover:bg-[#16191d]"
              >
                {renderVariantCardPreview(variant.id)}
                <div className="mt-3 text-white">{variant.title}</div>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`absolute inset-y-0 right-0 h-full w-full border-l border-white/10 bg-[#0b1018] p-3 transition-transform duration-300 ease-out sm:w-[440px] sm:p-4 ${
            selectedVariant ? "translate-x-0" : "pointer-events-none translate-x-full"
          }`}
        >
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Edit Content</p>
              <h4 className="mt-1 text-base font-semibold text-white">{selectedMeta?.title}</h4>
            </div>
            <button
              onClick={() => setSelectedVariant(null)}
              className="rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
            >
              Back
            </button>
          </div>

          <div className="h-[calc(100%-92px)] overflow-y-auto space-y-4 pr-1">
            {renderEditorFields()}
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">Preview</p>
              {renderEditorPreview()}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setSelectedVariant(null)}
              className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleAddToCanvas}
              className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c3a]"
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
