"use client";

import { useRef, useState } from "react";

const DEFAULT_BIO_HTML = `<h2>About Me</h2>
<p>I build modern web apps, experiment with AI tooling, and care about great DX.</p>
<ul>
  <li>Next.js</li>
  <li>AI tooling</li>
  <li>Design systems</li>
</ul>`;

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(value);

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const markdownToHtml = (markdown) => {
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let listBuffer = [];
  let paragraphBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    const listItems = listBuffer.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    html.push(`<ul>${listItems}</ul>`);
    listBuffer = [];
  };

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return;
    html.push(`<p>${escapeHtml(paragraphBuffer.join(" "))}</p>`);
    paragraphBuffer = [];
  };

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      flushParagraph();
      return;
    }

    const h1 = trimmed.match(/^#\s+(.+)$/);
    if (h1) {
      flushList();
      flushParagraph();
      html.push(`<h1>${escapeHtml(h1[1])}</h1>`);
      return;
    }

    const h2 = trimmed.match(/^##\s+(.+)$/);
    if (h2) {
      flushList();
      flushParagraph();
      html.push(`<h2>${escapeHtml(h2[1])}</h2>`);
      return;
    }

    const h3 = trimmed.match(/^###\s+(.+)$/);
    if (h3) {
      flushList();
      flushParagraph();
      html.push(`<h3>${escapeHtml(h3[1])}</h3>`);
      return;
    }

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      listBuffer.push(bullet[1]);
      return;
    }

    flushList();
    paragraphBuffer.push(trimmed);
  });

  flushList();
  flushParagraph();

  return html.join("\n") || DEFAULT_BIO_HTML;
};

const buildInitialHtml = (initialData) => {
  const raw = String(initialData?.content || "").trim();
  if (!raw) return DEFAULT_BIO_HTML;
  if (hasHtmlTags(raw)) return raw;
  return markdownToHtml(raw);
};

const alignmentCommandMap = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
};

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const [editorHtml, setEditorHtml] = useState(buildInitialHtml(initialData));
  const editorRef = useRef(null);

  const syncEditorState = () => {
    if (!editorRef.current) return;
    setEditorHtml(editorRef.current.innerHTML);
  };

  const runCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
    syncEditorState();
  };

  const resetAndClose = () => {
    setEditorHtml(DEFAULT_BIO_HTML);
    onClose();
  };

  const handleSubmit = () => {
    const nextHtml = String(editorRef.current?.innerHTML || editorHtml).trim();
    onSave({
      content: nextHtml || DEFAULT_BIO_HTML,
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
              onClick={() => runCommand("formatBlock", "H1")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H1
            </button>
            <button
              onClick={() => runCommand("formatBlock", "H2")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H2
            </button>
            <button
              onClick={() => runCommand("formatBlock", "H3")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              H3
            </button>
            <button
              onClick={() => runCommand("formatBlock", "P")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Paragraph
            </button>
            <button
              onClick={() => runCommand("insertUnorderedList")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Bullets
            </button>
            <button
              onClick={() => runCommand("italic")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Italic
            </button>
            <button
              onClick={() => runCommand("underline")}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Underline
            </button>
            <button
              onClick={() => runCommand(alignmentCommandMap.left)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Left
            </button>
            <button
              onClick={() => runCommand(alignmentCommandMap.center)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Center
            </button>
            <button
              onClick={() => runCommand(alignmentCommandMap.right)}
              className="rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]"
            >
              Align Right
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={syncEditorState}
            className="markdown-body min-h-[520px] rounded-xl border border-white/10 bg-white p-4 text-black focus:outline-none"
            dangerouslySetInnerHTML={{ __html: editorHtml }}
          />

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
