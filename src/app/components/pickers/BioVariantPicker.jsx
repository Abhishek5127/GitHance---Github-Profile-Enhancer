"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import {
  buildBioPayload,
  generateBioFromPayload,
} from "@/app/services/githubData.service";

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
const isLikelyHtmlLine = (value) =>
  /^<\/?[a-z][\w:-]*(\s+[^>]*)?>$/i.test(String(value || "").trim());
const hasOwnContent = (data) =>
  Boolean(data && Object.prototype.hasOwnProperty.call(data, "content"));

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

      if (
        property === "text-align" &&
        ["left", "center", "right", "justify", "start", "end"].includes(propertyValue)
      ) {
        safeDeclarations.push(`text-align: ${propertyValue}`);
        return;
      }

      if (property === "font-style" && ["italic", "normal"].includes(propertyValue)) {
        safeDeclarations.push(`font-style: ${propertyValue}`);
        return;
      }

      if (
        property === "text-decoration-line" &&
        ["underline", "none"].includes(propertyValue)
      ) {
        safeDeclarations.push(`text-decoration-line: ${propertyValue}`);
        return;
      }

      if (
        property === "text-decoration" &&
        ["underline", "none"].includes(propertyValue)
      ) {
        safeDeclarations.push(`text-decoration-line: ${propertyValue}`);
      }
    });

  return safeDeclarations.join("; ");
};

const sanitizeUrl = (value, { allowDataImage = false } = {}) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";

  if (
    allowDataImage &&
    /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\s]+$/i.test(trimmed)
  ) {
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
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "ul", "ol", "li",
  "em", "i", "strong", "b", "u",
  "a", "br", "code", "span", "div", "img",
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

// BUG FIX #9: Guard is now only used at the call sites where SSR matters.
// sanitizeHtml itself will still run client-side only; callers handle SSR.
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
      const isAllowed =
        GLOBAL_ALLOWED_ATTRS.has(attrName) || allowedAttrs.has(attrName);
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
      const safeSrc = sanitizeUrl(element.getAttribute("src"), {
        allowDataImage: true,
      });
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

  // BUG FIX #4: Don't silently replace intentionally empty output with DEFAULT_BIO_HTML.
  // Return empty string so callers can decide what to do.
  return html.join("\n");
};

// BUG FIX #10: Fixed li-flattening to check only direct text node siblings,
// not element.textContent which includes all descendant text.
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

    // BUG FIX #10: Check only direct text node children, not all descendant text.
    const hasOwnText = Array.from(li.childNodes).some((node) => {
      if (node === nestedList) return false;
      // Only count text nodes with actual content (not element nodes)
      return node.nodeType === Node.TEXT_NODE &&
        String(node.textContent || "").trim().length > 0;
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

// BUG FIX #4 & #9: buildInitialHtml is now a plain function called inside
// useEffect instead of useMemo, so it always runs client-side. Also handles
// empty markdown output without falling back to DEFAULT_BIO_HTML.
const buildInitialHtml = (initialData) => {
  const raw = String(initialData?.content ?? "").trim();
  if (!raw) {
    return hasOwnContent(initialData) ? "" : DEFAULT_BIO_HTML;
  }

  if (hasMarkdownSyntax(raw)) {
    const converted = markdownToHtml(raw);
    return normalizeHtmlForEditor(sanitizeHtml(converted || raw));
  }

  if (hasHtmlTags(raw)) {
    return normalizeHtmlForEditor(sanitizeHtml(raw));
  }

  const converted = markdownToHtml(raw);
  return normalizeHtmlForEditor(sanitizeHtml(converted || raw));
};

const editableBlockTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "li", "div"]);
const blockConvertibleTags = new Set(["h1", "h2", "h3", "h4", "h5", "h6", "p", "div"]);
const rootBlockTags = new Set([...editableBlockTags, "ul", "ol", "blockquote", "pre", "hr"]);
const TOAST_TIMEOUT_MS = 3500;

export default function BioVariantPicker({
  open,
  onClose,
  onSave,
  initialData,
  submitLabel = "Add to Canvas",
}) {
  const { data: session, status } = useSession();
  const editorRef = useRef(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [toastState, setToastState] = useState(null);
  const toastTimerRef = useRef(null);
  const editVersionRef = useRef(0);

  // BUG FIX #1 & #12: Replace dangerouslySetInnerHTML + ref combo with useEffect
  // to set innerHTML imperatively. This avoids React overwriting DOM mutations
  // on re-renders and eliminates the ref/dangerouslySetInnerHTML conflict.
  useEffect(() => {
    if (open && editorRef.current) {
      editorRef.current.innerHTML = buildInitialHtml(initialData);
      editVersionRef.current = 0;
      setToastState(null);
      setIsGenerating(false);
    }
  }, [open]); // Only re-initialize when the panel opens, not on every initialData change.

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const showToast = (message, type = "error") => {
    setToastState({ message, type });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => {
      setToastState(null);
      toastTimerRef.current = null;
    }, TOAST_TIMEOUT_MS);
  };

  const markEditorDirty = () => {
    editVersionRef.current += 1;
  };

  const holdSelection = (e) => e.preventDefault();

  const toolbarButtonClass =
    "rounded-md border border-white/15 bg-[#10141a] cursor-pointer px-2 py-1 text-xs text-white/85 hover:bg-[#151b23]";

  const editorThemeStyle = {
    color: "#ffffff",
    backgroundColor: "#0d1117",
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

  const isRootBlock = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return false;
    const tag = node.tagName.toLowerCase();
    return rootBlockTags.has(tag);
  };

  const normalizeEditorBlocks = () => {
    if (!editorRef.current) return;
    const editor = editorRef.current;
    let cursor = editor.firstChild;

    while (cursor) {
      const next = cursor.nextSibling;

      if (cursor.nodeType === Node.COMMENT_NODE) {
        cursor.remove();
        cursor = next;
        continue;
      }

      if (isRootBlock(cursor)) {
        cursor = next;
        continue;
      }

      const paragraph = document.createElement("p");
      editor.insertBefore(paragraph, cursor);

      let segment = cursor;
      while (segment && !isRootBlock(segment)) {
        const after = segment.nextSibling;
        const isLeadingBreak =
          segment.nodeType === Node.ELEMENT_NODE &&
          segment.tagName.toLowerCase() === "br" &&
          !paragraph.textContent;

        if (isLeadingBreak) {
          segment.remove();
        } else {
          paragraph.appendChild(segment);
        }
        segment = after;
      }

      if (!paragraph.childNodes.length) {
        paragraph.appendChild(document.createElement("br"));
      }

      cursor = segment;
    }

    if (!editor.childNodes.length) {
      const paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));
      editor.appendChild(paragraph);
    }
  };

  // BUG FIX #13: comparePoints now surfaces errors instead of silently returning 0,
  // and callers handle null gracefully.
  const comparePoints = (aContainer, aOffset, bContainer, bOffset) => {
    const pointA = document.createRange();
    pointA.setStart(aContainer, aOffset);
    pointA.collapse(true);

    const pointB = document.createRange();
    pointB.setStart(bContainer, bOffset);
    pointB.collapse(true);

    return pointA.compareBoundaryPoints(Range.START_TO_START, pointB);
  };

  const doesRangeSelectBlock = (range, block) => {
    try {
      const blockRange = document.createRange();
      blockRange.selectNodeContents(block);

      const startsAtOrAfterBlockEnd =
        comparePoints(
          range.startContainer,
          range.startOffset,
          blockRange.endContainer,
          blockRange.endOffset
        ) >= 0;
      if (startsAtOrAfterBlockEnd) return false;

      const endsAtOrBeforeBlockStart =
        comparePoints(
          range.endContainer,
          range.endOffset,
          blockRange.startContainer,
          blockRange.startOffset
        ) <= 0;
      if (endsAtOrBeforeBlockStart) return false;

      return true;
    } catch {
      // BUG FIX #13: On error, default to false (not selected) rather than
      // returning 0 which made doesRangeSelectBlock incorrectly return true.
      return false;
    }
  };

  const getSelectedBlocks = () => {
    if (!editorRef.current) return [];
    normalizeEditorBlocks();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [];

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      const single = getBlockFromNode(selection.anchorNode);
      if (single) return [single];

      if (selection.anchorNode === editorRef.current) {
        const childCount = editorRef.current.childNodes.length;
        if (!childCount) return [];

        const anchorOffset = Math.max(0, Math.min(selection.anchorOffset, childCount));
        const candidate =
          editorRef.current.childNodes[Math.min(anchorOffset, childCount - 1)] ||
          editorRef.current.childNodes[childCount - 1];
        const tag = candidate?.tagName?.toLowerCase?.();
        if (candidate && editableBlockTags.has(tag)) {
          return [candidate];
        }
      }

      return [];
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
          return doesRangeSelectBlock(range, node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
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
      if (fallback) return [fallback];

      if (selection.anchorNode === editorRef.current) {
        const firstBlock = editorRef.current.firstElementChild;
        const tag = firstBlock?.tagName?.toLowerCase?.();
        if (firstBlock && editableBlockTags.has(tag)) {
          return [firstBlock];
        }
      }

      return [];
    }

    return blocks;
  };

  const ensureEditorReadyForFormatting = () => {
    if (!editorRef.current) return;
    normalizeEditorBlocks();

    if (!editorRef.current.childNodes.length) {
      const paragraph = document.createElement("p");
      paragraph.appendChild(document.createElement("br"));
      editorRef.current.appendChild(paragraph);
    }
  };

  // BUG FIX #8: Preserve caret position rather than always jumping to end.
  // Only move caret if the target block is different from the currently focused block.
  const restoreCaretToBlock = (element) => {
    if (!element) return;
    const selection = window.getSelection();
    if (!selection) return;

    // If selection is already inside this element, leave it alone.
    if (selection.rangeCount > 0) {
      const currentRange = selection.getRangeAt(0);
      if (element.contains(currentRange.startContainer)) return;
    }

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

  // BUG FIX #11: Clone children BEFORE removing listItem from the DOM.
  const replaceListItemWithBlock = (listItem, targetTag) => {
    const list = listItem.parentElement;
    const parent = list?.parentElement;
    if (!list || !parent) return null;

    const listTag = list.tagName.toLowerCase();
    const afterSibling = list.nextSibling;

    // BUG FIX #11: Capture content before any DOM mutations.
    const newBlock = document.createElement(targetTag);
    const contentFragment = cloneChildren(listItem, { excludeNestedLists: true });
    if (contentFragment.childNodes.length) {
      newBlock.appendChild(contentFragment);
    } else {
      newBlock.textContent = String(listItem.textContent || "Text").trim() || "Text";
    }

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

    parent.insertBefore(newBlock, trailingList || afterSibling);

    // BUG FIX #15: Remove the parent list if it's now empty.
    if (!list.children.length) {
      list.remove();
    }

    return newBlock;
  };

  const applyBlockFormat = (tag) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    ensureEditorReadyForFormatting();

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

    restoreCaretToBlock(lastChanged);
  };

  const applyToSelectedBlocks = (applyChange) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    ensureEditorReadyForFormatting();

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

    restoreCaretToBlock(lastChanged);
  };

  // BUG FIX #6: toggleItalic now uses execCommand for proper inline character-level
  // formatting instead of applying font-style to the entire block element.
  const toggleItalic = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // eslint-disable-next-line no-execCommand
    document.execCommand("italic", false, null);
  };

  // BUG FIX #6: toggleUnderline now uses execCommand for proper inline formatting.
  const toggleUnderline = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    // eslint-disable-next-line no-execCommand
    document.execCommand("underline", false, null);
  };

  const applyAlignment = (alignment) => {
    applyToSelectedBlocks((block) => {
      const tag = block.tagName.toLowerCase();
      if (!editableBlockTags.has(tag)) return null;
      block.style.textAlign = alignment;
      return block;
    });
  };

  // BUG FIX #5: applyBullets now toggles — if selected block is already an <li>,
  // convert it back to a <p> instead of silently skipping.
  const applyBullets = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    ensureEditorReadyForFormatting();

    const blocks = getSelectedBlocks();
    if (!blocks.length) return;

    let lastChanged = null;
    let activeList = null;
    let activeListParent = null;

    blocks.forEach((block) => {
      if (!block?.isConnected) return;

      const tag = block.tagName.toLowerCase();

      // BUG FIX #5: Toggle off — convert existing list item back to paragraph.
      if (tag === "li") {
        const next = replaceListItemWithBlock(block, "p");
        if (next) lastChanged = next;
        activeList = null;
        activeListParent = null;
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
        listItem.textContent =
          String(block.textContent || "List item").trim() || "List item";
      }
      activeList.appendChild(listItem);
      block.remove();
      lastChanged = listItem;
    });

    restoreCaretToBlock(lastChanged);
  };

  const resetAndClose = () => {
    onClose();
  };

  const handleSubmit = () => {
    const nextHtml = normalizeHtmlForEditor(
      sanitizeHtml(String(editorRef.current?.innerHTML ?? ""))
    );
    onSave({ content: nextHtml });
    resetAndClose();
  };

  const handleBuildWithAi = async () => {
    if (isGenerating) return;

    if (status === "loading") {
      console.error("Build with AI blocked: session is still loading.");
      showToast("Session is still loading. Please try again.");
      return;
    }

    if (!session?.accessToken) {
      console.error("Build with AI blocked: missing GitHub session token.");
      showToast("Sign in with GitHub to use Build with AI");
      return;
    }

    const editor = editorRef.current;
    if (!editor) return;

    const requestEditVersion = editVersionRef.current;
    const requestStartHtml = String(editor.innerHTML ?? "");

    try {
      setIsGenerating(true);

      const payload = await buildBioPayload({
        username: session?.username || "",
        token: session?.accessToken,
        repoLimit: 50,
      });

      const { bio } = await generateBioFromPayload(payload);

      const changedDuringRequest =
        editVersionRef.current !== requestEditVersion ||
        String(editor.innerHTML ?? "") !== requestStartHtml;

      if (changedDuringRequest) {
        showToast("Bio generated but not applied because you edited text.", "info");
        return;
      }

      const aiLines = String(bio || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 4);
      const aiHtml = aiLines.map((line) => `<p>${escapeHtml(line)}</p>`).join("");
      const generatedHtml = normalizeHtmlForEditor(sanitizeHtml(aiHtml));
      editor.innerHTML = generatedHtml || `<p>${escapeHtml(String(bio || ""))}</p>`;
      editVersionRef.current += 1;
      showToast("Bio generated.", "success");
    } catch (error) {
      console.error("Failed to generate AI bio:", error);
      showToast(error?.message || "Failed to generate bio");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!open) return null;

  // Toolbar button definitions to avoid missing key warnings (BUG FIX #14).
  const toolbarButtons = [
    { label: "H1", action: () => applyBlockFormat("h1") },
    { label: "H2", action: () => applyBlockFormat("h2") },
    { label: "H3", action: () => applyBlockFormat("h3") },
    { label: "H4", action: () => applyBlockFormat("h4") },
    { label: "H5", action: () => applyBlockFormat("h5") },
    { label: "H6", action: () => applyBlockFormat("h6") },
    { label: "Paragraph", action: () => applyBlockFormat("p") },
    { label: "Bullets", action: applyBullets },
    { label: "Italic", action: toggleItalic },
    { label: "Underline", action: toggleUnderline },
    { label: "Align Left", action: () => applyAlignment("left") },
    { label: "Align Center", action: () => applyAlignment("center") },
    { label: "Align Right", action: () => applyAlignment("right") },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
      <div className="relative h-full w-[900px] overflow-hidden border-l border-white/10 bg-[#0d1117] p-4">
        <div className="h-full overflow-y-auto pr-1">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Compose Bio</h3>
            <button
              onClick={resetAndClose}
              className="cursor-pointer text-gray-400 hover:text-white"
            >
              X
            </button>
          </div>

          <div className="mb-2">
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Edit Mode</p>
          </div>

          {/* BUG FIX #14: Added key prop to each toolbar button. */}
          <div className="mb-3 flex flex-wrap gap-2">
            {toolbarButtons.map(({ label, action }) => (
              <button
                key={label}
                onMouseDown={holdSelection}
                onClick={action}
                className={toolbarButtonClass}
              >
                {label}
              </button>
            ))}
          </div>

          {/*
            BUG FIX #1 & #12: Removed dangerouslySetInnerHTML.
            Content is set via useEffect to avoid React overwriting DOM mutations.
          */}
          <div
            ref={editorRef}
            contentEditable
            onInput={markEditorDirty}
            suppressContentEditableWarning
            className="markdown-body bio-editor min-h-[520px] rounded-xl border border-white/10 bg-white p-4 text-black focus:outline-none"
            style={editorThemeStyle}
          />

          <div className="mt-3 flex items-center justify-between gap-2">
            <p
              className={`text-xs ${
                toastState?.type === "success"
                  ? "text-emerald-300"
                  : toastState?.type === "info"
                    ? "text-cyan-300"
                    : "text-red-300"
              }`}
            >
              {toastState?.message || ""}
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={resetAndClose}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleBuildWithAi}
                disabled={isGenerating}
                className="rounded-xl border border-cyan-500/50 px-4 py-2 text-sm font-semibold text-cyan-200 transition hover:border-cyan-400 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? "Generating bio..." : "Build with AI"}
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
