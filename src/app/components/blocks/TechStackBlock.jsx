"use client";

import { buildRenderUrl } from "@/app/lib/generateBlockSvg";

export default function TechStackBlock({ item, setItems }) {
  const data = item?.data || {};
  const variant = data.variant || "grid";
  const theme = data.theme || "midnight";
  const stack = data.stack || ["Next.js", "React", "Node.js", "Tailwind CSS"];

  const updateField = (field, value) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, data: { ...i.data, [field]: value } }
          : i
      )
    );
  };

  const updateStack = (value) => {
    const next = value
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    updateField("stack", next);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const previewSrc = buildRenderUrl({
    baseUrl,
    type: "stack",
    variant,
    params: {
      theme,
      s: stack,
    },
  });

  return (
    <div className="w-full rounded-3xl border border-white/10 bg-white/5 p-5 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Tech Stack</div>
        <div className="flex gap-2">
          <select
            value={variant}
            onChange={(e) => updateField("variant", e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0f1115] px-3 py-1 text-xs text-white"
          >
            <option value="grid">Grid</option>
            <option value="orbit">Orbit</option>
            <option value="barcode">Barcode</option>
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

      <input
        value={stack.join(", ")}
        onChange={(e) => updateStack(e.target.value)}
        placeholder="Next.js, React, Node.js, Tailwind CSS"
        className="mt-4 w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
      />

      <div className="mt-5 rounded-2xl border border-white/10 bg-[#0f1115] p-3">
        <img src={previewSrc} alt="Tech stack preview" className="w-full" />
      </div>
    </div>
  );
}