"use client";

import ReadmeRenderer from "./blocks/ReadmeRenderer";

const fallbackContent = `## About Me

I build modern web apps, experiment with AI tooling, and care about great DX.

- Next.js
- AI tooling
- Design systems`;

export default function BioBlock({ item }) {
  const data = item?.data || {};

  const legacyTitle = String(data.title || "About Me").trim();
  const legacySummary = String(data.summary || "").trim();
  const legacyFocus = Array.isArray(data.focus)
    ? data.focus.map((point) => String(point || "").trim()).filter(Boolean)
    : [];
  const legacyContent = `## ${legacyTitle}

${legacySummary}

${legacyFocus.map((point) => `- ${point}`).join("\n")}`.trim();

  const content = String(data.content || legacyContent || fallbackContent).trim();

  return (
    <div className="w-full rounded-xl border border-white/10 bg-[#0f1115] p-3">
      <ReadmeRenderer readme={content} compact />
    </div>
  );
}
