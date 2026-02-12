"use client";

import { buildRenderUrl } from "@/app/lib/generateBlockSvg";

export default function BioBlock({ item, setItems }) {
  const data = item?.data || {};
  const variant = data.variant || "badge";
  const theme = data.theme || "midnight";

  const updateField = (field, value) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, data: { ...i.data, [field]: value } }
          : i
      )
    );
  };

  const updateFocus = (index, value) => {
    const next = [...(data.focus || [])];
    next[index] = value;
    updateField("focus", next);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const previewSrc = buildRenderUrl({
    baseUrl,
    type: "bio",
    variant,
    params: {
      title: data.title || "Full Stack Developer",
      summary: data.summary || "Building modern web apps and thoughtful experiences.",
      theme,
      c: data.focus || [],
    },
  });

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Short Bio</div>
        <div className="flex gap-2">
          <select
            value={variant}
            onChange={(e) => updateField("variant", e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f1115] px-3 py-1 text-xs text-white"
          >
            <option value="badge">Badge</option>
            <option value="timeline">Timeline</option>
            <option value="spotlight">Spotlight</option>
          </select>
          <select
            value={theme}
            onChange={(e) => updateField("theme", e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f1115] px-3 py-1 text-xs text-white"
          >
            <option value="midnight">Midnight</option>
            <option value="aurora">Aurora</option>
            <option value="ember">Ember</option>
          </select>
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        <input
          value={data.title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="Full Stack Developer"
          className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
        />
        <textarea
          value={data.summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="Write a short bio about what you build and care about."
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          {(data.focus || ["Next.js", "AI tooling", "Design systems"]).map((itemValue, index) => (
            <input
              key={index}
              value={itemValue}
              onChange={(e) => updateFocus(index, e.target.value)}
              placeholder="Focus area"
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-xs text-white focus:outline-none"
            />
          ))}
        </div>
      </div>

      <div className="mt-2 h-[120px] overflow-hidden rounded-lg border border-white/10 bg-[#0f1115] p-1">
        <img src={previewSrc} alt="Bio preview" className="block h-full w-full object-cover" />
      </div>
    </div>
  );
}
