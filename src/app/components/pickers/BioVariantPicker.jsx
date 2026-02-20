"use client";

import { useMemo, useRef } from "react";

const DEFAULT_BIO_HTML = `<h2>About Me</h2>
<p>I build modern web apps, experiment with AI tooling, and care about great DX.</p>
<ul>
  <li>Next.js</li>
  <li>AI tooling</li>
  <li>Design systems</li>
</ul>`;

const hasHtmlTags = (value) => /<\/?[a-z][\s\S]*>/i.test(value);
const hasMarkdownSyntax = (value) =>
  /(^|\n)\s*(#{1,6}\s+.+|[-*]\s+.+|\d+\.\s+.+)\s*($|\n)/m.test(String(value || ""));
const isLikelyHtmlLine = (value) => /^<\/?[a-z][\w:-]*(\s+[^>]*)?>$/i.test(String(value || "").trim());
const hasOwnContent = (data) => Boolean(data && Object.prototype.hasOwnProperty.call(data, "content"));

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const sanitizeStyleAttribute = (value) => {
  const safeDeclarations = [];

  String(value || "")
    .split(";")
    .forEach((entry) => {
      const [rawProperty, ...rawValueParts] = entry.split(":");
      if (!rawProperty || !rawValueParts.length) return;

      const property = rawProperty.trim().toLowerCase();
      const propertyValue = rawValueParts.join(":").trim().toLowerCase();
      if (!propertyValue) return;

      if (property === "text-align" && ["left", "center", "right", "justify", "start", "end"].includes(propertyValue)) {
        safeDeclarations.push(`text-align: ${propertyValue}`);
        return;
      }

      if (property === "font-style" && ["italic", "normal"].includes(propertyValue)) {
        safeDeclarations.push(`font-style: ${propertyValue}`);
        return;
      }

      if (property === "text-decoration-line" && ["underline", "none"].includes(propertyValue)) {
        safeDeclarations.push(`text-decoration-line: ${propertyValue}`);
        return;
      }

      if (property === "text-decoration" && ["underline", "none"].includes(propertyValue)) {
        safeDeclarations.push(`text-decoration-line: ${propertyValue}`);
      }
    });

  return safeDeclarations.join("; ");
};

const sanitizeUrl = (value, { allowDataImage = false } = {}) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (allowDataImage && /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed;
  }

  if (/^\s*javascript:/i.test(trimmed)) {
    return "";
  }

  if (typeof window === "undefined") return trimmed;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    const protocol = parsed.protocol.toLowerCase();
    if (["http:", "https:", "mailto:"].includes(protocol)) {
      return trimmed;
    }
  } catch {
    return "";
  }

  return "";
};

const ALLOWED_TAGS = new Set([
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "ul",
  "ol",
  "li",
  "em",
  "i",
  "strong",
  "b",
  "u",
  "a",
  "br",
  "code",
  "span",
  "div",
  "img",
]);

const GLOBAL_ALLOWED_ATTRS = new Set(["style"]);

const ALLOWED_ATTRS = {
  a: new Set(["href", "title", "target", "rel"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
  div: new Set(["align"]),
  p: new Set(["align"]),
  h1: new Set(["align"]),
  h2: new Set(["align"]),
  h3: new Set(["align"]),
  h4: new Set(["align"]),
  h5: new Set(["align"]),
  h6: new Set(["align"]),
};

const sanitizeHtml = (html) => {
  if (typeof window === "undefined") return String(html || "");

  const root = document.createElement("div");
  root.innerHTML = String(html || "");

  const elements = Array.from(root.querySelectorAll("*"));
  elements.forEach((element) => {
    if (!element?.isConnected) return;

    const tag = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) {
      const parent = element.parentNode;
      if (!parent) return;
      while (element.firstChild) {
        parent.insertBefore(element.firstChild, element);
      }
      element.remove();
      return;
    }

    const allowedAttrs = ALLOWED_ATTRS[tag] || new Set();

    Array.from(element.attributes).forEach((attribute) => {
      const attrName = attribute.name.toLowerCase();
      const isAllowed = GLOBAL_ALLOWED_ATTRS.has(attrName) || allowedAttrs.has(attrName);
      if (!isAllowed) {
        element.removeAttribute(attribute.name);
        return;
      }

      if (attrName === "style") {
        const safeStyle = sanitizeStyleAttribute(attribute.value);
        if (safeStyle) {
          element.setAttribute("style", safeStyle);
        } else {
          element.removeAttribute("style");
        }
      }
    });

    if (tag === "a") {
      const safeHref = sanitizeUrl(element.getAttribute("href"));
      if (safeHref) {
        element.setAttribute("href", safeHref);
      } else {
        element.removeAttribute("href");
      }

      const target = element.getAttribute("target");
      if (target && target !== "_blank") {
        element.removeAttribute("target");
      }

      if (element.getAttribute("target") === "_blank") {
        element.setAttribute("rel", "noopener noreferrer");
      } else {
        element.removeAttribute("rel");
      }
    }

    if (tag === "img") {
      const safeSrc = sanitizeUrl(element.getAttribute("src"), { allowDataImage: true });
      if (safeSrc) {
        element.setAttribute("src", safeSrc);
      } else {
        element.remove();
      }
    }
  });

  return root.innerHTML.trim();
};

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

    if (isLikelyHtmlLine(trimmed)) {
      flushList();
      flushParagraph();
      html.push(trimmed);
      return;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushList();
      flushParagraph();
      const level = heading[1].length;
      html.push(`<h${level}>${escapeHtml(heading[2])}</h${level}>`);
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

  root.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((heading) => {
    const nested = heading.querySelector("h1,h2,h3,h4,h5,h6");
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
  return normalized;
};

const buildInitialHtml = (initialData) => {
  const raw = String(initialData?.content ?? "").trim();
  if (!raw) {
    return hasOwnContent(initialData) ? "" : DEFAULT_BIO_HTML;
  }

  if (hasMarkdownSyntax(raw)) {
    return normalizeHtmlForEditor(sanitizeHtml(markdownToHtml(raw)));
  }

  if (hasHtmlTags(raw)) {
    return normalizeHtmlForEditor(sanitizeHtml(raw));
  }

  return normalizeHtmlForEditor(sanitizeHtml(markdownToHtml(raw)));
};

const editableBlockTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "div"]);
const blockConvertibleTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"]);

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const initialHtml = useMemo(() => buildInitialHtml(initialData), [initialData]);
  const editorRef = useRef(null);
  const holdSelection = (e) => e.preventDefault();
  const toolbarButtonClass =
    "rounded-md border border-white/15 bg-[#10141a] px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]";
  const editorThemeStyle = {
    color: "#111827",
    backgroundColor: "#ffffff",
    "--fgColor-default": "#111827",
    "--bgColor-default": "#ffffff",
    "--borderColor-muted": "#d1d9e0",
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

  const isBoundaryPointAtBlockEdge = (container, offset, block, edge) => {
    if (!block) return false;

    try {
      const pointRange = document.createRange();
      pointRange.setStart(container, offset);
      pointRange.collapse(true);

      const edgeRange = document.createRange();
      edgeRange.selectNodeContents(block);
      edgeRange.collapse(edge === "start");

      return pointRange.compareBoundaryPoints(Range.START_TO_START, edgeRange) === 0;
    } catch {
      return false;
    }
  };

  const trimBoundaryOnlyBlocks = (blocks, range) => {
    if (!blocks.length || blocks.length === 1) return blocks;

    const trimmed = [...blocks];

    const firstBlock = trimmed[0];
    if (isBoundaryPointAtBlockEdge(range.startContainer, range.startOffset, firstBlock, "end")) {
      trimmed.shift();
    }

    if (trimmed.length > 1) {
      const lastBlock = trimmed[trimmed.length - 1];
      if (isBoundaryPointAtBlockEdge(range.endContainer, range.endOffset, lastBlock, "start")) {
        trimmed.pop();
      }
    }

    return trimmed;
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

    return trimBoundaryOnlyBlocks(blocks, range);
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

  const cloneChildren = (node, { excludeNestedLists = false } = {}) => {
    const fragment = document.createDocumentFragment();

    Array.from(node?.childNodes || []).forEach((child) => {
      if (
        excludeNestedLists &&
        child.nodeType === Node.ELEMENT_NODE &&
        ["ul", "ol"].includes(child.tagName.toLowerCase())
      ) {
        return;
      }

      fragment.appendChild(child.cloneNode(true));
    });

    return fragment;
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
    const contentFragment = cloneChildren(listItem, { excludeNestedLists: true });
    if (contentFragment.childNodes.length) {
      newBlock.appendChild(contentFragment);
    } else {
      newBlock.textContent = String(listItem.textContent || "Text").trim() || "Text";
    }
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

      if (!blockConvertibleTags.has(currentTag)) return;

      const newBlock = document.createElement(targetTag);
      const contentFragment = cloneChildren(block);
      if (contentFragment.childNodes.length) {
        newBlock.appendChild(contentFragment);
      } else {
        newBlock.textContent = String(block.textContent || "Text").trim() || "Text";
      }
      block.replaceWith(newBlock);
      lastChanged = newBlock;
    });

    setCaretToEnd(lastChanged);
  };

  const applyToSelectedBlocks = (applyChange) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const blocks = getSelectedBlocks();
    if (!blocks.length) return;

    let lastChanged = null;

    blocks.forEach((block) => {
      if (!block?.isConnected) return;
      const changed = applyChange(block);
      if (changed) {
        lastChanged = changed;
      }
    });

    setCaretToEnd(lastChanged);
  };

  const toggleItalic = () => {
    applyToSelectedBlocks((block) => {
      const tag = block.tagName.toLowerCase();
      if (!editableBlockTags.has(tag)) return null;
      block.style.fontStyle = block.style.fontStyle === "italic" ? "normal" : "italic";
      return block;
    });
  };

  const toggleUnderline = () => {
    applyToSelectedBlocks((block) => {
      const tag = block.tagName.toLowerCase();
      if (!editableBlockTags.has(tag)) return null;
      block.style.textDecorationLine =
        block.style.textDecorationLine === "underline" ? "none" : "underline";
      return block;
    });
  };

  const applyAlignment = (alignment) => {
    applyToSelectedBlocks((block) => {
      const tag = block.tagName.toLowerCase();
      if (!editableBlockTags.has(tag)) return null;
      block.style.textAlign = alignment;
      return block;
    });
  };

  const applyBullets = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const blocks = getSelectedBlocks();
    if (!blocks.length) return;

    let lastChanged = null;
    let activeList = null;
    let activeListParent = null;

    blocks.forEach((block) => {
      if (!block?.isConnected) return;

      const tag = block.tagName.toLowerCase();
      if (tag === "li") {
        activeList = null;
        activeListParent = null;
        lastChanged = block;
        return;
      }

      if (!blockConvertibleTags.has(tag)) {
        activeList = null;
        activeListParent = null;
        return;
      }

      const parent = block.parentElement;
      if (!parent) return;

      if (!activeList || activeListParent !== parent) {
        activeList = document.createElement("ul");
        activeListParent = parent;
        parent.insertBefore(activeList, block);
      }

      const listItem = document.createElement("li");
      const contentFragment = cloneChildren(block);
      if (contentFragment.childNodes.length) {
        listItem.appendChild(contentFragment);
      } else {
        listItem.textContent = String(block.textContent || "List item").trim() || "List item";
      }
      activeList.appendChild(listItem);
      block.remove();
      lastChanged = listItem;
    });

    setCaretToEnd(lastChanged);
  };

  const resetAndClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    const nextHtml = normalizeHtmlForEditor(sanitizeHtml(String(editorRef.current?.innerHTML ?? "")));
    onSave({
      content: nextHtml,
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
            <h4 className="mt-1 text-base font-semibold text-white">Bio Area</h4>
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
              onClick={() => applyBlockFormat("h4")}
              className={toolbarButtonClass}
            >
              H4
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("h5")}
              className={toolbarButtonClass}
            >
              H5
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyBlockFormat("h6")}
              className={toolbarButtonClass}
            >
              H6
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
              onClick={toggleItalic}
              className={toolbarButtonClass}
            >
              Italic
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={toggleUnderline}
              className={toolbarButtonClass}
            >
              Underline
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyAlignment("left")}
              className={toolbarButtonClass}
            >
              Align Left
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyAlignment("center")}
              className={toolbarButtonClass}
            >
              Align Center
            </button>
            <button
              onMouseDown={holdSelection}
              onClick={() => applyAlignment("right")}
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
            style={editorThemeStyle}
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
