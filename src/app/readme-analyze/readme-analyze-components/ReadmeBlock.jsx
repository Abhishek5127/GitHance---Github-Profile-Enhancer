"use client";

import React from "react";

const skeletonRows = [
  { type: "dir", width: "w-9/12" },
  { type: "file", width: "w-7/12" },
  { type: "file", width: "w-10/12" },
  { type: "dir", width: "w-8/12" },
  { type: "file", width: "w-6/12" },
  { type: "file", width: "w-11/12" },
  { type: "dir", width: "w-5/12" },
  { type: "file", width: "w-9/12" },
];

const ReadmeBlock = ({ tree = [], loading = false }) => {
  const fileCount = tree.filter((item) => item.type !== "folder").length;
  const folderCount = tree.filter((item) => item.type === "folder").length;

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80">
        <style jsx>{`
          @keyframes shimmerSweep {
            0% {
              transform: translateX(-120%);
            }
            100% {
              transform: translateX(120%);
            }
          }
          @keyframes glowPulse {
            0% {
              opacity: 0.35;
            }
            50% {
              opacity: 0.95;
            }
            100% {
              opacity: 0.35;
            }
          }
        `}</style>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <h3 className="font-semibold text-white">Analyzed Repository Structure</h3>
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
              scanning...
            </span>
            <span
              className="inline-flex h-2.5 w-2.5 rounded-full bg-cyan-300"
              style={{ animation: "glowPulse 1.2s ease-in-out infinite" }}
            />
          </div>
        </div>

        <div className="max-h-[500px] space-y-1 overflow-hidden px-4 py-3">
          {skeletonRows.map((row, index) => (
            <div
              key={`${row.type}-${index}`}
              className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5"
            >
              <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/60">
                {row.type}
              </span>
              <span className={`h-3 rounded ${row.width} bg-white/10`} />
            </div>
          ))}
        </div>

        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]"
          style={{ animation: "shimmerSweep 1.8s linear infinite" }}
        />
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 text-sm text-white/80">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
        <h3 className="font-semibold text-white">Analyzed Repository Structure</h3>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
            files: {fileCount}
          </span>
          <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1">
            folders: {folderCount}
          </span>
        </div>
      </div>

      <div className="max-h-[500px] space-y-1 overflow-y-auto px-4 py-3">
        {tree.length === 0 && <p className="text-white/50">No files found</p>}

        {tree.map((item, index) => (
          <div
            key={item.path || index}
            className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 transition hover:border-white/10 hover:bg-white/5"
          >
            <span className="rounded-full border border-white/10 bg-black/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-white/60">
              {item.type === "folder" ? "dir" : "file"}
            </span>
            <span className="truncate text-white/80">{item.path}</span>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ReadmeBlock;
