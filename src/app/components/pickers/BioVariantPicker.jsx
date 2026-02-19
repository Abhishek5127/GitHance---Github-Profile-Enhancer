"use client";

import { useRef, useState } from "react";
import ReadmeRenderer from "../blocks/ReadmeRenderer";

const DEFAULT_BIO_CONTENT = `## About Me

I build modern web apps, experiment with AI tooling, and care about great DX.

- Next.js
- AI tooling
- Design systems`;

const buildInitialContent = (initialData) =>
  String(initialData?.content || DEFAULT_BIO_CONTENT);

const ALIGN_WRAPPER_PATTERN = /^<div align="(?:left|center|right)">\n?([\s\S]*?)\n?<\/div>$/;

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const [content, setContent] = useState(buildInitialContent(initialData));
  const textareaRef = useRef(null);

  const replaceRange = (start, end, replacement, selectionStart, selectionEnd) => {
    const next = `${content.slice(0, start)}${replacement}${content.slice(end)}`;
    setContent(next);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(selectionStart, selectionEnd);
    });
  };

  const withSelection = (handler) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end);

    handler({ start, end, selected });
  };

  const transformLines = (lineTransform) => {
    withSelection(({ start, end }) => {
      const blockStart = content.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
      const nextBreak = content.indexOf("\n", end);
      const blockEnd = nextBreak === -1 ? content.length : nextBreak;

      const block = content.slice(blockStart, blockEnd);
      const transformed = block
        .split("\n")
        .map((line) => lineTransform(line))
        .join("\n");

      replaceRange(blockStart, blockEnd, transformed, blockStart, blockStart + transformed.length);
    });
  };

  const wrapSelection = (before, after = before, fallback = "text") => {
    withSelection(({ start, end, selected }) => {
      const target = selected || fallback;
      const replacement = `${before}${target}${after}`;
      const cursorStart = start + before.length;
      const cursorEnd = cursorStart + target.length;
      replaceRange(start, end, replacement, cursorStart, cursorEnd);
    });
  };

  const applyHeading = (level) => {
    const prefix = `${"#".repeat(level)} `;
    transformLines((line) => {
      const stripped = line
        .replace(/^#{1,6}\s+/, "")
        .replace(/^\s*[-*]\s+/, "");
      return `${prefix}${stripped}`.trimEnd();
    });
  };

  const applyParagraph = () => {
    transformLines((line) => line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, ""));
  };

  const applyBullets = () => {
    transformLines((line) => {
      if (!line.trim()) return line;
      const stripped = line.replace(/^#{1,6}\s+/, "").replace(/^\s*[-*]\s+/, "");
      return `- ${stripped}`;
    });
  };

  const applyAlignment = (align) => {
    withSelection(({ start, end, selected }) => {
      if (start === end) {
        const trimmed = content.trim();
        const match = trimmed.match(ALIGN_WRAPPER_PATTERN);
        const inner = match ? match[1] : trimmed || "Your text";
        setContent(`<div align="${align}">\n${inner}\n</div>`);
        return;
      }

      const selectedTrimmed = selected.trim();
      const wrappedMatch = selectedTrimmed.match(ALIGN_WRAPPER_PATTERN);
      const inner = wrappedMatch ? wrappedMatch[1] : selected;
      const replacement = `<div align="${align}">\n${inner}\n</div>`;
      replaceRange(start, end, replacement, start, start + replacement.length);
    });
  };

  const resetAndClose = () => {
    setContent(DEFAULT_BIO_CONTENT);
    onClose();
  };

  const handleSubmit = () => {
    onSave({
      content: content.trim(),
    });
    resetAndClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="relative h-full w-[900px] overflow-hidden border-l border-white/10 bg-[#0d1117] p-4">
        <div className="h-full overflow-y-auto pr-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Compose Bio</h3>
            <button onClick={resetAndClose} className="cursor-pointer text-gray-400 hover:text-white">
              X
            </button>
          </div>

          <div className="mb-2">
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Edit Mode</p>
            <h4 className="mt-1 text-base font-semibold text-white">Single Bio Area</h4>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              onClick={() => applyHeading(1)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H1
            </button>
            <button
              onClick={() => applyHeading(2)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H2
            </button>
            <button
              onClick={() => applyHeading(3)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H3
            </button>
            <button
              onClick={applyParagraph}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Paragraph
            </button>
            <button
              onClick={applyBullets}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Bullets
            </button>
            <button
              onClick={() => wrapSelection("*", "*", "italic")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Italic
            </button>
            <button
              onClick={() => wrapSelection("<u>", "</u>", "underlined")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Underline
            </button>
            <button
              onClick={() => applyAlignment("left")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Left
            </button>
            <button
              onClick={() => applyAlignment("center")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Center
            </button>
            <button
              onClick={() => applyAlignment("right")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Right
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="w-full rounded-xl border border-white/10 bg-[#0f1115] px-3 py-3 font-mono text-sm text-white focus:outline-none"
            />

            <div className="rounded-xl border border-white/10 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-black/50">
                Preview
              </p>
              <ReadmeRenderer readme={content} />
            </div>
          </div>

          <div className="mt-3 flex items-center justify-end gap-2">
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
  );
}
