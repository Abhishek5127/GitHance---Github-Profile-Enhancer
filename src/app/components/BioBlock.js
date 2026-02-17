"use client";

export default function BioBlock({ item, setItems }) {
  const data = item?.data || {};
  const title = data.title || "About Me";
  const summary = data.summary || "";
  const focus = Array.isArray(data.focus) ? data.focus : ["Next.js", "AI tooling", "Design systems"];

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
    const next = [...focus];
    next[index] = value;
    updateField("focus", next);
  };

  const markdownPreview = `## ${title.trim() || "About Me"}

${summary.trim()}

${focus
  .map((itemValue) => String(itemValue || "").trim())
  .filter(Boolean)
  .map((itemValue) => `- ${itemValue}`)
  .join("\n")}`.trim();

  return (
    <div className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs uppercase tracking-[0.3em] text-white/40">Short Bio (Markdown)</div>
      </div>

      <div className="mt-2 grid gap-2">
        <input
          value={title}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="About Me"
          className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
        />
        <textarea
          value={summary}
          onChange={(e) => updateField("summary", e.target.value)}
          placeholder="Write a short bio about what you build and care about."
          rows={2}
          className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          {focus.map((itemValue, index) => (
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

      <div className="mt-2 rounded-lg border border-white/10 bg-[#0f1115] p-2">
        <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-white/45">Markdown Preview</p>
        <pre className="whitespace-pre-wrap text-xs text-white/85">{markdownPreview}</pre>
      </div>
    </div>
  );
}
