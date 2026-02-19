"use client";

import { useRef } from "react";

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

const normalizeHtmlForEditor = (html) => {
  if (typeof window === "undefined") return html;

  const root = document.createElement("div");
  root.innerHTML = String(html || "");

  root.querySelectorAll("h1,h2,h3").forEach((heading) => {
    const nested = heading.querySelector("h1,h2,h3");
    if (nested) {
      heading.innerHTML = nested.innerHTML;
    }
  });

  root.querySelectorAll("li").forEach((li) => {
    const nestedList = Array.from(li.children).find((child) => {
      const tag = child.tagName?.toLowerCase?.();
      return tag === "ul" || tag === "ol";
    });

    if (!nestedList) return;

    const hasOwnText = Array.from(li.childNodes).some((node) => {
      if (node === nestedList) return false;
      return String(node.textContent || "").trim().length > 0;
    });

    if (hasOwnText) return;

    const parentList = li.parentElement;
    while (nestedList.firstChild) {
      parentList.insertBefore(nestedList.firstChild, li.nextSibling);
    }
    li.remove();
  });

  const normalized = root.innerHTML.trim();
  return normalized || DEFAULT_BIO_HTML;
};

const buildInitialHtml = (initialData) => {
  const raw = String(initialData?.content || "").trim();
  if (!raw) return DEFAULT_BIO_HTML;
  if (hasHtmlTags(raw)) return normalizeHtmlForEditor(raw);
  return markdownToHtml(raw);
};

const alignmentCommandMap = {
  left: "justifyLeft",
  center: "justifyCenter",
  right: "justifyRight",
};

const editableBlockTags = new Set(["h1", "h2", "h3", "p", "li", "div"]);

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const initialHtml = buildInitialHtml(initialData);
  const editorRef = useRef(null);
  const holdSelection = (e) => e.preventDefault();
  const toolbarButtonClass =
    "rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]";

  const runCommand = (command, value = null) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, value);
  };

  const getBlockFromNode = (node) => {
    if (!node || !editorRef.current) return null;
    let cursor = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;

    while (cursor && cursor !== editorRef.current) {
      const tag = cursor?.tagName?.toLowerCase?.();
      if (editableBlockTags.has(tag)) {
        return cursor;
      }
      cursor = cursor.parentElement;
    }

    return null;
  };

  const hasEditableAncestor = (node) => {
    if (!node || !editorRef.current) return false;
    let cursor = node.parentElement;
    while (cursor && cursor !== editorRef.current) {
      const tag = cursor?.tagName?.toLowerCase?.();
      if (editableBlockTags.has(tag)) return true;
      cursor = cursor.parentElement;
    }
    return false;
  };

  const getSelectedBlocks = () => {
    if (!editorRef.current) return [];

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const single = getBlockFromNode(selection.anchorNode);
      return single ? [single] : [];
    }

    const blocks = [];
    const seen = new Set();
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const tag = node?.tagName?.toLowerCase?.();
          if (!editableBlockTags.has(tag)) return NodeFilter.FILTER_SKIP;
          if (hasEditableAncestor(node)) return NodeFilter.FILTER_SKIP;
          try {
            return range.intersectsNode(node)
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_SKIP;
          } catch {
            return NodeFilter.FILTER_SKIP;
          }
        },
      }
    );

    let current = walker.nextNode();
    while (current) {
      if (!seen.has(current)) {
        seen.add(current);
        blocks.push(current);
      }
      current = walker.nextNode();
    }

    if (!blocks.length) {
      const fallback = getBlockFromNode(selection.anchorNode);
      return fallback ? [fallback] : [];
    }

    return blocks;
  };

  const setCaretToEnd = (element) => {
    const selection = window.getSelection();
    if (!selection || !element) return;
    const range = document.createRange();
    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const replaceListItemWithBlock = (listItem, targetTag) => {
    const list = listItem.parentElement;
    const parent = list?.parentElement;
    if (!list || !parent) return null;

    const listTag = list.tagName.toLowerCase();
    const afterSibling = list.nextSibling;
    const afterItems = [];

    let cursor = listItem.nextElementSibling;
    while (cursor) {
      afterItems.push(cursor);
      cursor = cursor.nextElementSibling;
    }

    listItem.remove();

    let trailingList = null;
    if (afterItems.length) {
      trailingList = document.createElement(listTag);
      afterItems.forEach((item) => trailingList.appendChild(item));
      parent.insertBefore(trailingList, afterSibling);
    }

    const newBlock = document.createElement(targetTag);
    newBlock.textContent = String(listItem.textContent || "Text").trim();
    parent.insertBefore(newBlock, trailingList || afterSibling);

    if (!list.children.length) {
      list.remove();
    }

    return newBlock;
  };

  const applyBlockFormat = (tag) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const targetTag = tag.toLowerCase();
    const blocks = getSelectedBlocks();
    if (!blocks.length) return;

    let lastChanged = null;

    blocks.forEach((block) => {
      if (!block?.isConnected) return;

      const currentTag = block.tagName.toLowerCase();
      if (currentTag === targetTag) {
        lastChanged = block;
        return;
      }

      if (currentTag === "li") {
        const next = replaceListItemWithBlock(block, targetTag);
        if (next) lastChanged = next;
        return;
      }

      if (!["h1", "h2", "h3", "p", "div"].includes(currentTag)) return;

      const newBlock = document.createElement(targetTag);
      newBlock.textContent = String(block.textContent || "Text").trim();
      block.replaceWith(newBlock);
      lastChanged = newBlock;
    });

    setCaretToEnd(lastChanged);
  };

  const applyBullets = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const blocks = getSelectedBlocks();
    if (!blocks.length) return;

    let lastChanged = null;

    blocks.forEach((block) => {
      if (!block?.isConnected) return;

      const tag = block.tagName.toLowerCase();
      if (tag === "li") {
        lastChanged = block;
        return;
      }
      if (!["h1", "h2", "h3", "p", "div"].includes(tag)) return;

      const list = document.createElement("ul");
      const listItem = document.createElement("li");
      listItem.textContent = String(block.textContent || "List item").trim();
      list.appendChild(listItem);
      block.replaceWith(list);
      lastChanged = listItem;
    });

    setCaretToEnd(lastChanged);
  };

  const resetAndClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    const nextHtml = String(editorRef.current?.innerHTML || initialHtml).trim();
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
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("h1")}
              className={toolbarButtonClass}
            >
              H1
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("h2")}
              className={toolbarButtonClass}
            >
              H2
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("h3")}
              className={toolbarButtonClass}
            >
              H3
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("p")}
              className={toolbarButtonClass}
            >
              Paragraph
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={applyBullets}
              className={toolbarButtonClass}
            >
              Bullets
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => runCommand("italic")}
              className={toolbarButtonClass}
            >
              Italic
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => runCommand("underline")}
              className={toolbarButtonClass}
            >
              Underline
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => runCommand(alignmentCommandMap.left)}
              className={toolbarButtonClass}
            >
              Align Left
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => runCommand(alignmentCommandMap.center)}
              className={toolbarButtonClass}
            >
              Align Center
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => runCommand(alignmentCommandMap.right)}
              className={toolbarButtonClass}
            >
              Align Right
            </button>
          </div>

          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="markdown-body bio-editor min-h-[520px] rounded-xl border border-white/10 bg-white p-4 text-black focus:outline-none"
            dangerouslySetInnerHTML={{ __html: initialHtml }}
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
