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

export default function ReadmePreviewClient() {
  const payload = loadReadmePreviewPayload();
  const [feedback, setFeedback] = useState("");

  const filename = useMemo(
    () => buildReadmeDownloadFilename(payload || {}),
    [payload]
  );

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
      <main className="min-h-screen bg-[#f6f8fa] px-4 py-16 text-[#1f2328]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-black/8 bg-white p-8 shadow-[0_30px_80px_rgba(31,35,40,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#59636e]">README Preview</p>
          <h1 className="mt-4 text-4xl font-semibold">No preview is ready yet.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[#59636e] sm:text-base">
            Open the profile builder or the README Lab, generate markdown, then use the preview action to inspect the GitHub-style rendering here.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/profile-builder"
              className="rounded-full bg-[#1f883d] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1a7a36]"
            >
              Open profile builder
            </Link>
            <Link
              href="/analyze"
              className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#1f2328] transition hover:bg-black/[0.03]"
            >
              Open repository analyzer
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fa] px-4 py-10 text-[#1f2328] sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-4 rounded-[28px] border border-black/8 bg-white p-5 shadow-[0_28px_80px_rgba(31,35,40,0.08)] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#59636e]">GitHub README Preview</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{payload.title}</h1>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#59636e]">
              {payload.owner ? <span className="rounded-full border border-black/10 bg-[#f6f8fa] px-3 py-1">@{payload.owner}</span> : null}
              {payload.repo ? <span className="rounded-full border border-black/10 bg-[#f6f8fa] px-3 py-1">{payload.repo}</span> : null}
              <span className="rounded-full border border-black/10 bg-[#f6f8fa] px-3 py-1">{formatGeneratedAt(payload.generatedAt)}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCopy}
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#1f2328] transition hover:bg-black/[0.03]"
            >
              Copy Markdown
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="rounded-full bg-[#1f883d] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1a7a36]"
            >
              Download README
            </button>
            <Link
              href={payload.backHref || "/profile-builder"}
              className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#1f2328] transition hover:bg-black/[0.03]"
            >
              {payload.backLabel || "Back"}
            </Link>
          </div>
        </div>

        {feedback ? (
          <div className="mb-5 rounded-2xl border border-[#1f883d]/20 bg-[#1f883d]/8 px-4 py-3 text-sm text-[#1f6f31]">
            {feedback}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[28px] border border-black/8 bg-white shadow-[0_30px_80px_rgba(31,35,40,0.08)]">
          <div className="border-b border-black/8 bg-[#f6f8fa] px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 text-sm text-[#59636e]">README.md</span>
            </div>
          </div>
          <div className="overflow-x-auto px-4 py-6 sm:px-8 sm:py-8">
            <ReadmeRenderer readme={payload.markdown} />
          </div>
        </section>
      </div>
    </main>
  );
}
