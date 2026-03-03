"use client";

import React from "react";

const ReadmeBlock = ({ tree = [] }) => {
  const fileCount = tree.filter((item) => item.type !== "folder").length;
  const folderCount = tree.filter((item) => item.type === "folder").length;

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
