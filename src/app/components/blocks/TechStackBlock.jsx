"use client";

import { useMemo } from "react";
import ReadmeRenderer from "./ReadmeRenderer";
import { buildTechStackMarkdownSection } from "@/app/lib/genrateMarkdown";

export default function TechStackBlock({ item }) {
  const techStackMarkdown = useMemo(() => {
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";

    return buildTechStackMarkdownSection(item?.data || {}, {
      includeHeading: true,
      baseUrl,
    });
  }, [item?.data]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-white">
      <ReadmeRenderer readme={techStackMarkdown || "## Tech Stack"} compact />
    </div>
  );
}
