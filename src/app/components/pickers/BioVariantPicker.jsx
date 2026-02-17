"use client";

import { useState } from "react";

const BIO_DEFAULTS = {
  title: "About Me",
  summary: "I build modern web apps, experiment with AI tooling, and care about great DX.",
  focus: ["Next.js", "AI tooling", "Design systems"],
};

const ensureFocus = (value) => {
  const fallback = [...BIO_DEFAULTS.focus];
  const current = Array.isArray(value) ? value.filter(Boolean) : [];
  const merged = [...current, ...fallback];
  return merged.slice(0, 3);
};

const buildInitialFormData = (initialData) => {
  const merged = { ...BIO_DEFAULTS, ...(initialData || {}) };
  return {
    ...merged,
    focus: ensureFocus(merged.focus),
  };
};

const toMarkdown = (data) => {
  const title = (data.title || BIO_DEFAULTS.title).trim();
  const summary = (data.summary || "").trim();
  const focus = ensureFocus(data.focus).map((item) => item.trim()).filter(Boolean);

  const focusLines = focus.length ? `${focus.map((item) => `- ${item}`).join("\n")}\n` : "";

  return `## ${title}\n\n${summary}\n\n${focusLines}`.trim();
};

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData = null,
  submitLabel = "Add to Canvas",
}) {
  const [formData, setFormData] = useState(buildInitialFormData(initialData));

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateFocus = (index, value) => {
    const next = ensureFocus(formData.focus);
    next[index] = value;
    updateField("focus", next);
  };

  const resetAndClose = () => {
    setFormData({ ...BIO_DEFAULTS, focus: [...BIO_DEFAULTS.focus] });
    onClose();
  };

  const handleSubmit = () => {
    onSave({
      ...formData,
      focus: ensureFocus(formData.focus),
    });

    resetAndClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="relative h-full w-[820px] overflow-hidden border-l border-white/10 bg-[#0d1117] p-4">
        <div className="h-full overflow-y-auto pr-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Compose Bio Markdown</h3>
            <button onClick={resetAndClose} className="cursor-pointer text-gray-400 hover:text-white">
              X
            </button>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/40">Plain Markdown</p>
              <h4 className="mt-1 text-base font-semibold text-white">Bio Section</h4>
            </div>
          </div>

          <div className="space-y-4 pr-1">
            <div className="space-y-3">
              <input
                value={formData.title || ""}
                onChange={(e) => updateField("title", e.target.value)}
                placeholder="About Me"
                className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
              />
              <textarea
                value={formData.summary || ""}
                onChange={(e) => updateField("summary", e.target.value)}
                rows={3}
                placeholder="Write a short bio about what you build and care about."
                className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
              />
              <div className="grid grid-cols-1 gap-2">
                {ensureFocus(formData.focus).map((focusValue, index) => (
                  <input
                    key={`bio-focus-${index}`}
                    value={focusValue}
                    onChange={(e) => updateFocus(index, e.target.value)}
                    placeholder={`Focus ${index + 1}`}
                    className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-2 text-sm text-white focus:outline-none"
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-white/40">Markdown Preview</p>
              <pre className="whitespace-pre-wrap rounded-xl border border-white/10 bg-[#0f1115] p-3 text-xs text-white/85">
                {toMarkdown({
                  ...formData,
                  focus: ensureFocus(formData.focus),
                })}
              </pre>
            </div>

            <div className="mt-1 flex items-center justify-end gap-2">
              <button
                onClick={resetAndClose}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black hover:bg-[#ff8c3a]"
              >
                {submitLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
