"use client";

import { useMemo } from "react";
import ReadmeRenderer from "./ReadmeRenderer";
import { buildSocialLinksMarkdownSection } from "@/app/lib/genrateMarkdown";

export default function SocialLinksBlock({ item }) {
  const socialMarkdown = useMemo(
    () =>
      buildSocialLinksMarkdownSection(item?.data || {}, {
        includeHeading: true,
        darkSurface: true,
      }),
    [item?.data]
  );

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1115] p-4 text-white">
      {socialMarkdown ? (
        <ReadmeRenderer readme={socialMarkdown} compact />
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/65">
          Add at least one social media URL to show clickable icons here.
        </div>
      )}
    </div>
  );
}
