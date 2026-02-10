"use client";

import { useState, useEffect } from "react";
import SimpleHeaderPreview from "../previews/headers/SimpleHeaderPreview";
import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";
import SignatureHeaderPreview from "../previews/headers/SignatureHeaderPreview";
import AchievementHeaderPreview from "../previews/headers/AchievementHeaderPreview";
import TrophyHeaderPreview from "../previews/headers/TrophyHeaderPreview";
import RenderHeaderPreview from "../previews/headers/RenderHeaderPreview";

export default function HeaderVariantPicker({ open, onClose, onSelectVariant }) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setAnimateIn(true);
        });
      });
    } else {
      setAnimateIn(false);
    }
  }, [open]);

  const handleAnimationEnd = () => {
    if (!animateIn) {
      setMounted(false);
    }
  };

  if (!mounted) return null;

  const variants = [
    { id: "simple", title: "Badge Header", Preview: SimpleHeaderPreview },
    { id: "signature", title: "Signature Banner", Preview: SignatureHeaderPreview },
    { id: "achievement", title: "Achievement Flow", Preview: AchievementHeaderPreview },
    { id: "trophy", title: "Trophy Showcase", Preview: TrophyHeaderPreview },
    { id: "constellation", title: "Constellation", Preview: RenderHeaderPreview },
    { id: "signal", title: "Signal Wave", Preview: RenderHeaderPreview },
    { id: "terminal", title: "Terminal", Preview: RenderHeaderPreview },
    { id: "stacked", title: "Stacked Panels", Preview: RenderHeaderPreview },
    { id: "typingHeader", title: "Typing Header", Preview: TypingHeaderPreview },
    { id: "image", title: "Image Banner", Preview: ImageHeaderPreview },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-black/60
        transition-opacity duration-300
        ${animateIn ? "opacity-100" : "opacity-0 pointer-events-none"}`}
    >
      <div
        onTransitionEnd={handleAnimationEnd}
        className={`w-[820px] h-full bg-[#0d1117] border-l border-white/10 p-4
          transform transition-transform duration-300 ease-out
          ${animateIn ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Choose Header Style
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 cursor-pointer hover:text-white"
          >
            X
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {variants.map((v) => (
            <button
              key={v.id}
              onClick={() => onSelectVariant(v.id)}
              className="text-left p-4 rounded bg-[#111418] hover:bg-[#16191d] transition"
            >
              <v.Preview
                variant={v.id}
                name="Your Name"
                subtitle="Design + Code"
                theme="midnight"
                achievements={["Top 1% GitHub", "Open Source Mentor"]}
                accent="#ff7a1a"
                title="Highlights"
                columns={4}
              />

              <div className="mt-3">
                <div className="text-white font-medium">
                  {v.title}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}