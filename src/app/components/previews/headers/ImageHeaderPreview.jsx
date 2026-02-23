"use client";

import Image from "next/image";
import { assets } from "@/app/assets/assets";
import { generateHeaderSvg } from "@/app/lib/generateHeaderSvg";

export default function ImageHeaderPreview({ name, compact = false }) {
  
  function exportSvg() {
    const svg = generateHeaderSvg({
      text: `Hello, I am $${name}`,
      bannerUrl: "/headers/DragonBannerHeader.png",
    });
  }

  return (
    <div
      onClick={exportSvg}
      className={`relative w-full cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-[#0b0d0f] ${
        compact ? "h-[190px]" : ""
      }`}
      title="Click to export SVG"
    >
      {/* Preview-only overlay (NOT exported) */}
      <p className="absolute inset-0 flex items-center justify-center font-yuji font-bold text-white text-[18px] pointer-events-none">
        {`Hello, I am ${name}`};
      </p>

      {/* Preview banner */}
      <Image
        src={assets.DragonBannerHeader}
        alt="Dragon Banner"
        width={1600}
        height={400}
        className={compact ? "h-full w-full object-cover" : "w-full h-auto"}
        priority
      />
    </div>
  );
}
