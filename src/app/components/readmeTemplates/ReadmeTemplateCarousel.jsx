"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { antonio, poppins } from "@/app/fonts";
import GlassPanel from "@/app/components/ui/GlassPanel";
import { readmeTemplateCatalog } from "@/app/components/readmeTemplates/templateCatalog";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getClosestCardIndex = (container) => {
  const cards = Array.from(container.children);

  if (!cards.length) {
    return 0;
  }

  const center = container.scrollLeft + container.clientWidth / 2;
  let closestIndex = 0;
  let smallestDistance = Number.POSITIVE_INFINITY;

  cards.forEach((card, index) => {
    const cardCenter = card.offsetLeft + card.clientWidth / 2;
    const distance = Math.abs(center - cardCenter);

    if (distance < smallestDistance) {
      smallestDistance = distance;
      closestIndex = index;
    }
  });

  return closestIndex;
};

export default function ReadmeTemplateCarousel() {
  const containerRef = useRef(null);
  const pointerStateRef = useRef({
    id: null,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef(null);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const scrollToIndex = (index) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const safeIndex = clamp(index, 0, readmeTemplateCatalog.length - 1);
    const cards = container.children;
    const targetCard = cards[safeIndex];

    if (!targetCard) {
      return;
    }

    container.scrollTo({
      left: targetCard.offsetLeft,
      behavior: "smooth",
    });

    setActiveIndex(safeIndex);
  };

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let ticking = false;

    const onScroll = () => {
      if (ticking) {
        return;
      }

      ticking = true;
      window.requestAnimationFrame(() => {
        setActiveIndex(getClosestCardIndex(container));
        ticking = false;
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerDown = (event) => {
    const container = containerRef.current;

    if (!container) {
      return;
    }
    if (event.pointerType !== "mouse" || event.button !== 0 || !event.isPrimary) {
      return;
    }

    pointerStateRef.current = {
      id: event.pointerId,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false,
    };

    container.setPointerCapture(event.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (event) => {
    const container = containerRef.current;

    if (!container || !isDragging) {
      return;
    }

    if (event.pointerId !== pointerStateRef.current.id) {
      return;
    }

    const delta = event.clientX - pointerStateRef.current.startX;

    if (Math.abs(delta) > 4) {
      pointerStateRef.current.moved = true;
    }

    container.scrollLeft = pointerStateRef.current.startScrollLeft - delta;
  };

  const endPointerDrag = (event) => {
    const container = containerRef.current;

    if (!container || !isDragging) {
      return;
    }

    if (pointerStateRef.current.id !== null) {
      try {
        container.releasePointerCapture(pointerStateRef.current.id);
      } catch {
        // Ignore when pointer capture was not active.
      }
    }

    setIsDragging(false);

    const closestIndex = getClosestCardIndex(container);
    scrollToIndex(closestIndex);

    if (pointerStateRef.current.moved) {
      event.preventDefault();
      suppressClickRef.current = true;

      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }

      suppressClickTimeoutRef.current = window.setTimeout(() => {
        suppressClickRef.current = false;
        suppressClickTimeoutRef.current = null;
      }, 0);
    }

    pointerStateRef.current = {
      id: null,
      startX: 0,
      startScrollLeft: 0,
      moved: false,
    };
  };

  const handleClickCapture = (event) => {
    if (!suppressClickRef.current) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  };

  return (
    <section
      id="readme-templates"
      aria-labelledby="readme-templates-heading"
      className="relative mx-auto mt-20 w-full max-w-7xl px-4 pb-20 sm:mt-24 sm:px-6 lg:mt-28 lg:px-4"
    >
      <div className="pointer-events-none absolute -left-20 top-10 h-44 w-44 rounded-full bg-cyan-400/16 blur-3xl" />
      <div className="pointer-events-none absolute -right-10 bottom-4 h-56 w-56 rounded-full bg-violet-500/14 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-3xl">
          <p className={`${poppins.className} text-xs font-semibold uppercase tracking-[0.34em] text-cyan-200/85`}>
            README Templates Carousel
          </p>
          <h2
            id="readme-templates-heading"
            className={`${antonio.className} mt-3 text-4xl leading-none text-white sm:text-5xl lg:text-6xl`}
          >
            Launch-ready README templates in an interactive showcase.
          </h2>
          <p className={`${poppins.className} mt-4 max-w-2xl text-sm leading-7 text-white/65 sm:text-base`}>
            Swipe or drag through GitHub-style preview cards, pick a layout, and move directly into README generation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Previous template"
            onClick={() => scrollToIndex(activeIndex - 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white"
          >
            Prev
          </button>
          <button
            type="button"
            aria-label="Next template"
            onClick={() => scrollToIndex(activeIndex + 1)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/75 transition hover:border-cyan-300/60 hover:bg-cyan-400/10 hover:text-white"
          >
            Next
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pb-4 pr-4 select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointerDrag}
        onPointerCancel={endPointerDrag}
        onPointerLeave={(event) => {
          if (isDragging) {
            endPointerDrag(event);
          }
        }}
        onClickCapture={handleClickCapture}
      >
        {readmeTemplateCatalog.map((template, index) => {
          const Preview = template.Preview;

          return (
            <GlassPanel
              key={template.id}
              className={`group min-w-[82vw] snap-start p-4 transition duration-300 hover:-translate-y-1 hover:scale-[1.012] sm:min-w-[480px] sm:p-5 lg:min-w-[520px] ${
                activeIndex === index ? "border-cyan-300/45" : "border-white/14"
              }`}
              glowClassName={activeIndex === index ? "bg-cyan-400/24" : "bg-violet-500/16"}
            >
              <div className="rounded-2xl border border-[#30363d] bg-[#0d1117]">
                <div className="flex items-center justify-between border-b border-[#30363d] px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
                  </div>
                  <span className={`${poppins.className} text-[10px] uppercase tracking-[0.2em] text-[#8b949e]`}>
                    README.md
                  </span>
                </div>

                <div className="relative h-[260px] overflow-hidden bg-[#0d1117] p-3 sm:h-[290px]">
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0d1117] to-transparent" />
                  <div className="pointer-events-none origin-top-left scale-[0.42] sm:scale-[0.48]">
                    <div className="w-[240%] sm:w-[205%]">
                      <Preview />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="max-w-[80%]">
                  <h3 className={`${antonio.className} text-2xl leading-none text-white sm:text-3xl`}>{template.title}</h3>
                  <p className={`${poppins.className} mt-2 text-sm leading-6 text-white/62`}>{template.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`${poppins.className} rounded-full border border-cyan-300/30 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-100`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <Link
                  href={template.href}
                  className={`${poppins.className} inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-400/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-50 transition duration-300 hover:border-cyan-200 hover:bg-cyan-300/25`}
                >
                  {template.ctaLabel}
                </Link>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {readmeTemplateCatalog.map((template, index) => (
          <button
            key={template.id}
            type="button"
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to ${template.title}`}
            className={`h-2.5 rounded-full transition-all ${
              index === activeIndex ? "w-10 bg-cyan-300" : "w-2.5 bg-white/25 hover:bg-white/45"
            }`}
          />
        ))}
      </div>
    </section>
  );
}