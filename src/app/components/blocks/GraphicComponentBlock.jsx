"use client";

import { useMemo } from "react";
import ReadmeRenderer from "./ReadmeRenderer";
import { buildGraphicComponentMarkdownSection } from "@/app/lib/genrateMarkdown";

export default function GraphicComponentBlock({ item }) {
  const graphicMarkdown = useMemo(() => {
    const baseUrl =
      typeof window !== "undefined" ? window.location.origin : "";

    return buildGraphicComponentMarkdownSection(item?.data || {}, {
      baseUrl,
    });
  }, [item?.data]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-white">
      {graphicMarkdown ? (
        <ReadmeRenderer readme={graphicMarkdown} compact />
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
          Add a graphic component to render your decorative separator here.
        </div>
      )}
    </div>
  );
}
