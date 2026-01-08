"use client";
import { useEffect, useState } from "react";
import SimpleHeaderPreview from "../previews/headers/SimpleHeaderPreview";
import TypingHeaderPreview from "../previews/headers/TypingHeaderPreview";
import ImageHeaderPreview from "../previews/headers/ImageHeaderPreview";


export default function HeaderVariantPicker({ open, onClose, onSelectVariant }) {
    const username = "abhishek";

    const [mounted, setMounted] = useState(false);
    const [animateIn, setAnimateIn] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            // Delay to trigger animation after mount
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setAnimateIn(true);
                });
            });
        } else {
            setAnimateIn(false);
        }
    }, [open]);

    // unmount AFTER close animation
    const handleAnimationEnd = () => {
        if (!animateIn) {
            setMounted(false);
        }
    };

    if (!mounted) return null;

    const variants = [
        { id: "simple", title: "Simple Text Header", Preview: SimpleHeaderPreview },
        { id: "typingHeader", title: `Blinking Text`, Preview: TypingHeaderPreview },
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
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        ✕
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {variants.map((v) => (
                        <button
                            key={v.id}
                            onClick={() => onSelectVariant(v.id)}
                            className="
        text-left p-4 rounded
        bg-[#111418]
        hover:bg-[#16191d]
        transition
      "
                        >
                            <v.Preview />

                            <div className="mt-3">
                                <div className="text-white font-medium">
                                    {v.title}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {v.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
}

// Demo wrapper to test the component
function Demo() {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);

    return (
        <div className="min-h-screen bg-gray-900 p-8">
            <button
                onClick={() => setOpen(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
                Open Header Picker
            </button>

            {selected && (
                <p className="mt-4 text-white">Selected: {selected}</p>
            )}

            <HeaderVariantPicker
                open={open}
                onClose={() => setOpen(false)}
                onSelectVariant={(id) => {
                    setSelected(id);
                    setOpen(false);
                }}
            />
        </div>
    );
}