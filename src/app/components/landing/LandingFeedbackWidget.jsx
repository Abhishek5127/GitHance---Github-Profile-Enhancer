"use client";

import { useEffect, useRef, useState, useTransition } from "react";

const MAX_MESSAGE_LENGTH = 1200;
const MIN_MESSAGE_LENGTH = 3;

const STATUS_CLASS_MAP = {
success: "text-emerald-200",
error: "text-red-200",
info: "text-white/45",
};

const EMPTY_STATUS = {
tone: "info",
message: "",
};

export default function LandingFeedbackWidget() {
const [message, setMessage] = useState("");
const [status, setStatus] = useState(EMPTY_STATUS);
const [isPinnedOpen, setIsPinnedOpen] = useState(false);
const [isFocusedWithin, setIsFocusedWithin] = useState(false);
const [isPending, startTransition] = useTransition();

const containerRef = useRef(null);
const textareaRef = useRef(null);

const isExpanded = isPinnedOpen || isFocusedWithin;

useEffect(() => {
if (!isPinnedOpen) return;

```
const handlePointerDown = (event) => {
  if (containerRef.current?.contains(event.target)) return;

  setIsPinnedOpen(false);
  setIsFocusedWithin(false);
};

const handleKeyDown = (event) => {
  if (event.key !== "Escape") return;

  setIsPinnedOpen(false);
  setIsFocusedWithin(false);
};

window.addEventListener("pointerdown", handlePointerDown);
window.addEventListener("keydown", handleKeyDown);

return () => {
  window.removeEventListener("pointerdown", handlePointerDown);
  window.removeEventListener("keydown", handleKeyDown);
};
```

}, [isPinnedOpen]);

const focusTextarea = () => {
requestAnimationFrame(() => {
textareaRef.current?.focus();
});
};

const openPanel = () => {
setIsPinnedOpen(true);
focusTextarea();
};

const handleToggle = () => {
if (isExpanded) {
setIsPinnedOpen(false);
return;
}
openPanel();
};

const handleBlurCapture = (event) => {
const nextTarget = event.relatedTarget;
if (nextTarget && containerRef.current?.contains(nextTarget)) return;

```
setIsFocusedWithin(false);
setIsPinnedOpen(false);
```

};

const handleMessageChange = (event) => {
setMessage(event.target.value);

```
if (status.message) {
  setStatus(EMPTY_STATUS);
}
```

};

const handleSubmit = (event) => {
event.preventDefault();

```
const trimmedMessage = message.trim();
if (trimmedMessage.length < MIN_MESSAGE_LENGTH) {
  setStatus({
    tone: "error",
    message: "Share a little more detail before sending.",
  });
  openPanel();
  return;
}

startTransition(async () => {
  try {
    const response = await fetch("/api/feedback", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: trimmedMessage,
        page: window.location.pathname || "/",
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || "Unable to save feedback right now.");
    }

    setMessage("");
    setStatus({
      tone: "success",
      message: "Thanks, your feedback was saved.",
    });
    setIsPinnedOpen(true);
    focusTextarea();
  } catch (error) {
    setStatus({
      tone: "error",
      message:
        error instanceof Error
          ? error.message
          : "Unable to save feedback right now.",
    });
    setIsPinnedOpen(true);
  }
});
```

};

return (
<div
ref={containerRef}
className="fixed bottom-4 right-4 z-[70] flex max-w-[calc(100vw-1rem)] items-end gap-3 sm:bottom-5 sm:right-5 sm:max-w-[calc(100vw-2rem)]"
onFocusCapture={() => setIsFocusedWithin(true)}
onBlurCapture={handleBlurCapture}
>
<div
className={`overflow-hidden rounded-[28px] border border-white/12 bg-[#11161d]/95 shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out ${
          isExpanded
            ? "pointer-events-auto w-[min(20rem,calc(100vw-5.75rem))] translate-x-0 translate-y-0 opacity-100"
            : "pointer-events-none w-0 translate-x-4 translate-y-2 opacity-0"
        }`}
aria-hidden={!isExpanded}
> <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4"> <div> <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffb37f]">
Quick Feedback </p> <p className="mt-1 text-sm text-white/60">
Tell us what should feel better on GitHance. </p> </div>

```
      <textarea
        id="landing-feedback-message"
        ref={textareaRef}
        rows={4}
        maxLength={MAX_MESSAGE_LENGTH}
        value={message}
        onChange={handleMessageChange}
        disabled={!isExpanded}
        tabIndex={isExpanded ? 0 : -1}
        placeholder="Type your feedback here..."
        className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/28 disabled:cursor-default disabled:opacity-0 focus:border-[#ff7a1a]/45 focus:bg-black/30"
      />

      <div className="flex items-center justify-between gap-3">
        <p
          aria-live="polite"
          className={`text-xs leading-5 ${
            STATUS_CLASS_MAP[status.tone] || STATUS_CLASS_MAP.info
          }`}
        >
          {status.message ||
            `${message.trim().length}/${MAX_MESSAGE_LENGTH} characters`}
        </p>

        <button
          type="submit"
          disabled={!isExpanded || isPending}
          tabIndex={isExpanded ? 0 : -1}
          className="inline-flex shrink-0 rounded-full bg-[#ff7a1a] px-4 py-2 text-xs font-semibold text-black transition hover:bg-[#ff8c3a] disabled:cursor-not-allowed disabled:bg-[#ff7a1a]/60"
        >
          {isPending ? "Saving..." : "Send"}
        </button>
      </div>
    </form>
  </div>

  <button
    type="button"
    onClick={handleToggle}
    aria-expanded={isExpanded}
    aria-controls="landing-feedback-message"
    className="inline-flex h-12 items-center justify-center rounded-full border border-[#ff7a1a]/35 bg-[#141b23]/92 px-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#ffd6b7] shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-[#ff7a1a]/55 hover:bg-[#1a222c]"
  >
    Feedback
  </button>
</div>
);
}
