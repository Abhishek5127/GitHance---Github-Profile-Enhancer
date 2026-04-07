"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import {
  buildReadmeDownloadFilename,
  loadReadmePreviewPayload,
} from "@/app/lib/readmePreview";

function formatGeneratedAt(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "Just now";

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function MetaPill({ children }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70">
      {children}
    </span>
  );
}

function ActionButton({ as: Component = "button", className = "", children, ...props }) {
  return (
    <Component
      className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-sm font-semibold transition ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

export default function ReadmePreviewClient() {
  const payload = loadReadmePreviewPayload();
  const [feedback, setFeedback] = useState("");

  const filename = useMemo(
    () => buildReadmeDownloadFilename(payload || {}),
    [payload]
  );

  const previewTitle = String(payload?.title || "README Preview").trim() || "README Preview";
  const previewOwner = String(payload?.owner || "").trim();
  const previewRepo = String(payload?.repo || "").trim();

  const handleCopy = async () => {
    if (!payload?.markdown) return;

    try {
      await navigator.clipboard.writeText(payload.markdown);
      setFeedback("README markdown copied.");
    } catch {
      setFeedback("Clipboard copy failed in this browser.");
    }
  };

  const handleDownload = () => {
    if (!payload?.markdown || typeof window === "undefined") return;

    const blob = new Blob([payload.markdown], { type: "text/markdown;charset=utf-8" });
    const href = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.URL.revokeObjectURL(href);
    setFeedback(`Downloaded ${filename}.`);
  };

  if (!payload?.markdown) {
    return (
      <main className="relative min-h-[100svh] overflow-x-clip overflow-y-hidden bg-[#05070b] px-4 py-12 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.28),_transparent_65%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(83,208,255,0.18),_transparent_65%)] blur-3xl" />

        <div className="relative mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
          <div className="w-full rounded-[32px] border border-white/10 bg-[#0b0f14]/92 p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">
              README Preview
            </p>
            <h1 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">
              No preview is ready yet.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Generate markdown in the profile builder or README Lab, then open preview to inspect the same content in a GitHub-style render surface.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionButton
                as={Link}
                href="/profile-builder"
                className="bg-[#ff7a1a] text-black hover:bg-[#ff8c3a]"
              >
                Open profile builder
              </ActionButton>
              <ActionButton
                as={Link}
                href="/analyze"
                className="border border-white/12 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
              >
                Open repository analyzer
              </ActionButton>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-[100svh] overflow-x-clip overflow-y-hidden bg-[#05070b] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.28),_transparent_65%)] blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-10 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(83,208,255,0.18),_transparent_65%)] blur-3xl" />

      <div className="relative mx-auto max-w-7xl">
        <section className="rounded-[32px] border border-white/10 bg-[#0b0f14]/92 p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur sm:p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">
                README Preview
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl lg:text-[2.8rem]">
                {previewTitle}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                This preview uses the exact markdown prepared for export, wrapped in a GitHub-like paper surface so spacing, images, and badges are easy to sanity-check before copy or download.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {previewOwner ? <MetaPill>@{previewOwner}</MetaPill> : null}
                {previewRepo ? <MetaPill>{previewRepo}</MetaPill> : null}
                <MetaPill>{formatGeneratedAt(payload.generatedAt)}</MetaPill>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ActionButton
                type="button"
                onClick={handleCopy}
                className="border border-white/12 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
              >
                Copy Markdown
              </ActionButton>
              <ActionButton
                type="button"
                onClick={handleDownload}
                className="bg-[#ff7a1a] text-black hover:bg-[#ff8c3a]"
              >
                Download README
              </ActionButton>
              <ActionButton
                as={Link}
                href={payload.backHref || "/profile-builder"}
                className="border border-white/12 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
              >
                {payload.backLabel || "Back"}
              </ActionButton>
            </div>
          </div>
        </section>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {feedback}
          </div>
        ) : null}

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-4">
            <section className="rounded-[28px] border border-white/10 bg-[#0b0f14]/92 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
                Export Tools
              </p>
              <div className="mt-4 space-y-3 text-sm text-white/65">
                <p>Copy the markdown when you want a quick paste into GitHub.</p>
                <p>Download the file when you want a local `.md` export with the exact generated filename.</p>
                <p>Use back to adjust blocks, spacing, or assets without losing the current preview flow.</p>
              </div>
            </section>

            <section className="rounded-[28px] border border-white/10 bg-[#0b0f14]/92 p-5 shadow-[0_28px_80px_rgba(0,0,0,0.35)] backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/40">
                Rendering Notes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-white/65">
                <li>Images and stat cards are rendered from the same markdown payload being exported.</li>
                <li>The preview surface stays GitHub-like, while the surrounding shell matches the app.</li>
                <li>Final GitHub spacing can still vary slightly based on repository context and cached images.</li>
              </ul>
            </section>
          </aside>

          <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[#0b0f14]/92 shadow-[0_36px_100px_rgba(0,0,0,0.42)] backdrop-blur">
            <div className="border-b border-white/10 bg-[#0d1117] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
                  <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#28c840]" />
                  <span className="ml-2 text-sm text-white/55">README.md</span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/55">
                  GitHub-style render surface
                </span>
              </div>
            </div>

            <div className="bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))] p-3 sm:p-5 lg:p-6">
              <div className="overflow-x-auto rounded-[24px] border border-black/10 bg-white px-4 py-6 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:px-8 sm:py-8">
                <ReadmeRenderer readme={payload.markdown} />
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
