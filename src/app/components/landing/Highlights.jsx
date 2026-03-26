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

const VIEWBOX_WIDTH = 1200;
const VIEWBOX_HEIGHT = 220;
const ARC_OFFSET_Y = 8;
const VISIBLE = 3;
const ANGLE_SPAN = 150;
const ARC_RX = 720;
const ARC_RY = 650;
const FEATURE_STEP = ANGLE_SPAN / (VISIBLE - 1);
const CYCLE_MS = 3000;
const HOLD_MS = 1000;
const MOVE_MS = CYCLE_MS - HOLD_MS;
const RESUME_AUTOPLAY_MS = 3000;
const LABEL_FONT_SIZE = 24;
const LETTER_SPACING_EM = 0.13;
const ARC_RADIUS_ESTIMATE = (ARC_RX + ARC_RY) / 2;
const LABEL_SIDE_PADDING = 72;
const EDGE_FADE_START = 0.62;

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function getAutoplayDelta(elapsed) {
  const cycle = Math.floor(elapsed / CYCLE_MS);
  const phase = elapsed % CYCLE_MS;
  const moveProgress = phase <= HOLD_MS ? 0 : easeInOutSine((phase - HOLD_MS) / MOVE_MS);

  return cycle + moveProgress;
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

function getWheelAngle(event, svgElement) {
  const rect = svgElement.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + ((ARC_OFFSET_Y + ARC_RY) / VIEWBOX_HEIGHT) * rect.height;

  return Math.atan2(event.clientY - centerY, event.clientX - centerX);
}

function normalizeAngleDelta(delta) {
  let nextDelta = delta;

  while (nextDelta > Math.PI) {
    nextDelta -= Math.PI * 2;
  }

  while (nextDelta < -Math.PI) {
    nextDelta += Math.PI * 2;
  }

  return nextDelta;
}

export default function Highlights() {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(null);
  const svgRef = useRef(null);
  const progressRef = useRef(0);
  const manualProgressRef = useRef(0);
  const velocityRef = useRef(0);
  const isDraggingRef = useRef(false);
  const dragAngleRef = useRef(null);
  const dragTimeRef = useRef(null);
  const autoplayEnabledRef = useRef(true);
  const autoplayStartTimeRef = useRef(null);
  const autoplayBaseProgressRef = useRef(0);
  const resumeAutoplayAtRef = useRef(null);

  useEffect(() => {
    function animate(timestamp) {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = timestamp;
      }

      const deltaMs = timestamp - lastFrameRef.current;
      lastFrameRef.current = timestamp;
      let nextProgress = progressRef.current;

      if (autoplayEnabledRef.current && !isDraggingRef.current) {
        if (autoplayStartTimeRef.current === null) {
          autoplayStartTimeRef.current = timestamp;
        }

        const elapsed = timestamp - autoplayStartTimeRef.current;
        nextProgress = autoplayBaseProgressRef.current + getAutoplayDelta(elapsed);
        manualProgressRef.current = nextProgress;
      } else if (!isDraggingRef.current) {
        if (Math.abs(velocityRef.current) > 0.00008) {
          manualProgressRef.current += velocityRef.current * deltaMs;
          velocityRef.current *= Math.pow(0.92, deltaMs / 16.67);
        } else {
          velocityRef.current = 0;
          const snapTarget = Math.round(manualProgressRef.current);
          const snapStrength = Math.min(1, deltaMs * 0.012);
          manualProgressRef.current += (snapTarget - manualProgressRef.current) * snapStrength;

          if (Math.abs(snapTarget - manualProgressRef.current) < 0.001) {
            manualProgressRef.current = snapTarget;
          }
        }

        if (resumeAutoplayAtRef.current !== null && timestamp >= resumeAutoplayAtRef.current) {
          autoplayEnabledRef.current = true;
          autoplayBaseProgressRef.current = manualProgressRef.current;
          autoplayStartTimeRef.current = timestamp;
          resumeAutoplayAtRef.current = null;
          velocityRef.current = 0;
        }

        nextProgress = manualProgressRef.current;
      }

      progressRef.current = nextProgress;
      setProgress(nextProgress);
      frameRef.current = window.requestAnimationFrame(animate);
    }

    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      lastFrameRef.current = null;
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  function handlePointerDown(event) {
    if (!svgRef.current) {
      return;
    }

    autoplayEnabledRef.current = false;
    autoplayStartTimeRef.current = null;
    resumeAutoplayAtRef.current = null;
    isDraggingRef.current = true;
    manualProgressRef.current = progressRef.current;
    velocityRef.current = 0;
    dragAngleRef.current = getWheelAngle(event, svgRef.current);
    dragTimeRef.current = performance.now();
    svgRef.current.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    if (!isDraggingRef.current || !svgRef.current || dragAngleRef.current === null) {
      return;
    }

    const angle = getWheelAngle(event, svgRef.current);
    const deltaAngle = normalizeAngleDelta(angle - dragAngleRef.current);
    const now = performance.now();
    const deltaMs = Math.max(1, now - (dragTimeRef.current ?? now));
    const deltaProgress = -((deltaAngle * 180) / Math.PI) / FEATURE_STEP;

    dragAngleRef.current = angle;
    dragTimeRef.current = now;
    manualProgressRef.current += deltaProgress;
    progressRef.current = manualProgressRef.current;
    velocityRef.current = deltaProgress / deltaMs;

    setProgress(manualProgressRef.current);
  }

  function handlePointerUp(event) {
    if (!svgRef.current) {
      return;
    }

    isDraggingRef.current = false;
    dragAngleRef.current = null;
    dragTimeRef.current = null;
    resumeAutoplayAtRef.current = performance.now() + RESUME_AUTOPLAY_MS;

    if (svgRef.current.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
  }

  const baseIndex = Math.floor(progress);
  const cycleProgress = progress - baseIndex;

  const pills = Array.from({ length: VISIBLE }, (_, i) => {
    const offset = i - (VISIBLE - 1) / 2;
    const angleDeg = offset * FEATURE_STEP - cycleProgress * FEATURE_STEP;
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
      aria-labelledby="highlights-heading"
      className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-4 py-20 sm:gap-16 sm:px-6 sm:py-24"
    >
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">Repository + Profile Intelligence</p>
        <h2 id="highlights-heading" className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
          Why developers use <span className="text-neutral-400">GitHance</span>
        </h2>
        <p className="mx-auto mt-4 max-w-3xl text-neutral-400 sm:text-lg">
          GitHance brings GitHub README generation, repository analysis, security review, and profile optimization into
          one product surface so documentation and discoverability improve together.
        </p>
      </div>

      <div
        className="relative flex h-[180px] w-full cursor-grab justify-center overflow-hidden select-none touch-pan-y active:cursor-grabbing sm:h-[220px]"
        style={{
          WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
          maskImage: "linear-gradient(to right, transparent 0%, black 15%, black 85%, transparent 100%)",
        }}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
          xmlns="http://www.w3.org/2000/svg"
          className="w-full max-w-6xl overflow-visible"
          style={{ overflow: "visible" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          aria-hidden="true"
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

      <div className="-mt-4 flex items-center justify-center sm:-mt-8 md:-mt-12 md:mr-8 lg:-mt-20 lg:mr-20">
        <div className="relative w-full max-w-5xl">
          <Image
            src={assets.Highlights}
            alt="GitHance dashboard preview showing GitHub repository analysis and README optimization"
            className="h-auto w-full"
            draggable="false"
            sizes="(min-width: 1280px) 960px, (min-width: 768px) 90vw, 95vw"
          />
          <div className="pointer-events-none absolute inset-x-[10%] bottom-0 h-px bg-gradient-to-r from-transparent via-[#4ade80] to-transparent" />
          <div className="pointer-events-none absolute inset-x-[18%] bottom-[-10px] h-6 rounded-full bg-[#4ade80]/30 blur-2xl" />
        </div>
      </div>
    </section>
  );
}

