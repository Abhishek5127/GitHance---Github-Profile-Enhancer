"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { assets } from "@/app/assets/assets";

const features = [
  "Smart Repository Insights",
  "Automated README Generation",
  "Advanced Security Audits",
  "Comprehensive Profile Analytics",
  "Developer Performance Tracking",
  "Repository Health Monitoring",
  "Commit History Visualization",
  "Code Quality Evaluation",
  "Contribution Analysis",
  "AI-Powered Suggestions",
];

// Arc config
const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 220;
const ARC_OFFSET_Y = 8;
const VISIBLE = 3;
const ANGLE_SPAN = 150;
const ARC_RX = 720;
const ARC_RY = 650;
const CYCLE_MS = 3000;
const HOLD_MS = 1000;
const MOVE_MS = CYCLE_MS - HOLD_MS;
const LABEL_FONT_SIZE = 24;
const LETTER_SPACING_EM = 0.13;
const ARC_RADIUS_ESTIMATE = (ARC_RX + ARC_RY) / 2;
const LABEL_SIDE_PADDING = 72;
const EDGE_FADE_START = 0.62;

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function getEdgeOpacity(absAngle, halfSpan) {
  const fadeStart = halfSpan * EDGE_FADE_START;

  if (absAngle <= fadeStart) {
    return 1;
  }

  if (absAngle >= halfSpan) {
    return 0;
  }

  const fadeProgress = (absAngle - fadeStart) / (halfSpan - fadeStart);
  return 1 - easeInOutSine(fadeProgress);
}

function getArcPoint(angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: VIEWBOX_WIDTH / 2 + ARC_RX * Math.sin(rad),
    y: ARC_OFFSET_Y + ARC_RY - ARC_RY * Math.cos(rad),
  };
}

function getArcSegmentPath(centerAngleDeg, spanDeg) {
  const start = getArcPoint(centerAngleDeg - spanDeg / 2);
  const end = getArcPoint(centerAngleDeg + spanDeg / 2);
  return `M ${start.x} ${start.y} A ${ARC_RX} ${ARC_RY} 0 0 1 ${end.x} ${end.y}`;
}

function getFeatureSpan(label) {
  const estimatedGlyphWidth = LABEL_FONT_SIZE * (0.62 + LETTER_SPACING_EM);
  const estimatedPathLength = label.length * estimatedGlyphWidth + LABEL_SIDE_PADDING;
  const estimatedAngle = (estimatedPathLength / ARC_RADIUS_ESTIMATE) * (180 / Math.PI);

  return Math.min(44, Math.max(20, estimatedAngle));
}

export default function Highlights() {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    function animate(timestamp) {
      if (startRef.current === null) {
        startRef.current = timestamp;
      }

      const elapsed = timestamp - startRef.current;
      const cycle = Math.floor(elapsed / CYCLE_MS);
      const phase = elapsed % CYCLE_MS;
      const moveProgress = phase <= HOLD_MS
        ? 0
        : easeInOutSine((phase - HOLD_MS) / MOVE_MS);

      setProgress((cycle + moveProgress) % features.length);
      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const baseIndex = Math.floor(progress);
  const cycleProgress = progress - baseIndex;

  const pills = Array.from({ length: VISIBLE }, (_, i) => {
    const offset = i - (VISIBLE - 1) / 2;
    const step = ANGLE_SPAN / (VISIBLE - 1);
    const angleDeg = offset * step - cycleProgress * step;
    const featureIdx = ((baseIndex + i) % features.length + features.length) % features.length;
    const label = `"${features[featureIdx]}"`;
    const pathD = getArcSegmentPath(angleDeg, getFeatureSpan(label));

    const absAngle = Math.abs(angleDeg);
    const halfSpan = ANGLE_SPAN / 2;
    const opacity = getEdgeOpacity(absAngle, halfSpan);

    return { pathD, label, opacity, i, absAngle };
  });

  return (
    <section
      id="product"
      className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-24"
    >
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight text-white md:text-6xl">
          Why <span className="text-neutral-400">Githance?</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-500">
          Powerful tools to analyze, optimize, and showcase your GitHub like a pro.
        </p>
      </div>

      <div
        className="relative flex w-full justify-center overflow-hidden select-none"
        style={{
          height: VIEWBOX_HEIGHT,
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-6xl overflow-visible"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="pill-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={`M ${VIEWBOX_WIDTH / 2 - ARC_RX} ${ARC_OFFSET_Y + ARC_RY} A ${ARC_RX} ${ARC_RY} 0 0 1 ${VIEWBOX_WIDTH / 2 + ARC_RX} ${ARC_OFFSET_Y + ARC_RY}`}
            fill="none"
            stroke="rgba(74, 222, 128, 0.18)"
            strokeWidth="1.5"
            strokeDasharray="5 12"
          />

          {[...pills]
            .sort((left, right) => right.absAngle - left.absAngle)
            .map(({ pathD, label, opacity, i }) => (
              <g key={i} opacity={opacity}>
                <path id={`highlights-pill-curve-${i}`} d={pathD} fill="none" />
                <text
                  fontSize={LABEL_FONT_SIZE}
                  fontFamily="'DM Mono', 'Fira Code', 'Courier New', monospace"
                  fontWeight="700"
                  fill="#4ade80"
                  letterSpacing={`${LETTER_SPACING_EM}em`}
                  dy="5"
                  filter="url(#pill-glow)"
                >
                  <textPath
                    href={`#highlights-pill-curve-${i}`}
                    startOffset="50%"
                    textAnchor="middle"
                    method="align"
                    spacing="auto"
                  >
                    {label}
                  </textPath>
                </text>
              </g>
            ))}
        </svg>
      </div>

      <div className="-mt-16 flex items-center justify-center md:-mt-54 md:mr-20">
        <div className="relative w-full max-w-5xl">
          <Image
            src={assets.Highlights}
            alt="Githance highlights preview"
            className="h-auto w-full"
            priority
          />
          <div className="pointer-events-none absolute inset-x-[10%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#4ade80] to-transparent" />
          <div className="pointer-events-none absolute inset-x-[18%] bottom-[-10px] h-6 rounded-full bg-[#4ade80]/30 blur-2xl" />
        </div>
      </div>
    </section>
  );
}

