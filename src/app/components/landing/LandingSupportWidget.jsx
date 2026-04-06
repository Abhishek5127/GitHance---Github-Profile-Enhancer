"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supportCta } from "@/app/lib/support";

function BuyMeACoffeeIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 10.5h10v2.5a4 4 0 0 1-4 4H11a4 4 0 0 1-4-4v-2.5Z" />
      <path d="M17 11h1a2.5 2.5 0 1 1 0 5h-1" />
      <path d="M6 20h12" />
      <path d="M10 4.5c0 1-1 1.6-1 2.7 0 1 .6 1.5 1 2.3" />
      <path d="M14 4.5c0 1-1 1.6-1 2.7 0 1 .6 1.5 1 2.3" />
    </svg>
  );
}

export default function LandingSupportWidget() {
  const [isPinnedOpen, setIsPinnedOpen] = useState(false);
  const [isFocusedWithin, setIsFocusedWithin] = useState(false);

  const containerRef = useRef(null);
  const panelActionRef = useRef(null);

  const isExpanded = isPinnedOpen || isFocusedWithin;

  useEffect(() => {
    if (!isPinnedOpen) return;

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
  }, [isPinnedOpen]);

  const focusPrimaryAction = () => {
    requestAnimationFrame(() => {
      panelActionRef.current?.focus();
    });
  };

  const openPanel = () => {
    setIsPinnedOpen(true);
    focusPrimaryAction();
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

    setIsFocusedWithin(false);
    setIsPinnedOpen(false);
  };

  const panelClasses = `overflow-hidden rounded-[28px] border border-[#ffb37f]/18 bg-[linear-gradient(180deg,rgba(17,22,29,0.98),rgba(14,17,22,0.95))] shadow-[0_28px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out ${
    isExpanded
      ? "pointer-events-auto w-[min(20rem,calc(100vw-5.75rem))] translate-x-0 translate-y-0 opacity-100"
      : "pointer-events-none w-0 -translate-x-4 translate-y-2 opacity-0"
  }`;

  const triggerClasses =
    "inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#ffb37f]/35 bg-[linear-gradient(135deg,rgba(20,27,35,0.96),rgba(34,22,12,0.92))] px-4 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#ffe0c8] shadow-[0_16px_40px_rgba(0,0,0,0.45)] transition hover:-translate-y-0.5 hover:border-[#ffb37f]/55 hover:bg-[linear-gradient(135deg,rgba(28,37,48,1),rgba(53,31,15,0.98))]";

  const actionClasses =
    "inline-flex w-full items-center justify-center rounded-full bg-[#ff7a1a] px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff8c3a] focus:outline-none focus:ring-2 focus:ring-[#ffb37f]/50";

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 left-4 z-[70] flex max-w-[calc(100vw-1rem)] items-end gap-3 sm:bottom-5 sm:left-5 sm:max-w-[calc(100vw-2rem)]"
      onFocusCapture={() => setIsFocusedWithin(true)}
      onBlurCapture={handleBlurCapture}
    >
      <div id="landing-support-panel" className={panelClasses} aria-hidden={!isExpanded}>
        <div className="relative p-4">
          <button
            type="button"
            onClick={() => {
              setIsPinnedOpen(false);
              setIsFocusedWithin(false);
            }}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm text-white/50 transition hover:bg-white/10 hover:text-white"
            aria-label="Close support panel"
            tabIndex={isExpanded ? 0 : -1}
          >
            X
          </button>

          <div className="pr-10">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#ffb37f]">Buy Me A Coffee</p>
            <p className="mt-1 text-sm text-white/60">Support ongoing work on GitHance and help keep the tools public.</p>
          </div>

          <div className="mt-4 rounded-2xl border border-[#ffb37f]/12 bg-black/20 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#ffb37f]/18 bg-[#ffb37f]/10 text-[#ffe2cf]">
                <BuyMeACoffeeIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{supportCta.label}</p>
                <p className="mt-1 text-xs leading-5 text-white/52">{supportCta.helperText}</p>
              </div>
            </div>

            <div className="mt-4">
              {supportCta.isExternal ? (
                <a
                  ref={panelActionRef}
                  href={supportCta.href}
                  target="_blank"
                  rel="noreferrer"
                  tabIndex={isExpanded ? 0 : -1}
                  className={actionClasses}
                >
                  Open Support Page
                </a>
              ) : (
                <Link ref={panelActionRef} href={supportCta.href} tabIndex={isExpanded ? 0 : -1} className={actionClasses}>
                  Open Support Page
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        aria-controls="landing-support-panel"
        className={triggerClasses}
      >
        <BuyMeACoffeeIcon className="h-4 w-4" />
        Coffee
      </button>
    </div>
  );
}