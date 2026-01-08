"use client";

import Image from "next/image";
import { assets } from "@/app/assets/assets";
import { generateHeaderSvg } from "@/app/lib/generateHeaderSvg";

export default function ImageHeaderPreview() {

  function exportSvg() {
    const svg = generateHeaderSvg({
      text: "Hello, I am Abhishek",
      // IMPORTANT: this must be a public URL
      bannerUrl: "/headers/DragonBannerHeader.png",
    });
  }

  return (
    <div
      onClick={exportSvg}
      className="relative w-full rounded border border-white/10 bg-[#0b0d0f] overflow-hidden cursor-pointer"
      title="Click to export SVG"
    >
      {/* Preview-only overlay (NOT exported) */}
      <p className="absolute inset-0 flex items-center justify-center font-yuji font-bold text-white text-[18px] pointer-events-none">
        Hello, I am Abhishek
      </p>

      {/* Preview banner */}
      <Image
        src={assets.DragonBannerHeader}
        alt="Dragon Banner"
        width={1600}
        height={400}
        className="w-full h-auto"
        priority
      />
    </div>
  );
}
