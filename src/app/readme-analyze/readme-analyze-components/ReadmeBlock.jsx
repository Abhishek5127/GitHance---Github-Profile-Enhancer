"use client";

import React from "react";

const ReadmeBlock = ({ tree = [] }) => {
  return (
    <div className="w-full max-w-3xl rounded-md border border-[#30363d] bg-[#0d1117] text-sm text-gray-200">
      <div className="border-b border-[#30363d] px-4 py-2 font-semibold">
        Repository Structure
      </div>

      <div className="max-h-[500px] space-y-1 overflow-y-auto px-4 py-3">
        {tree.length === 0 && <p className="text-gray-400">No files found</p>}

        {tree.map((item, index) => (
          <div
            key={item.path || index}
            className="flex items-center gap-2 rounded px-2 py-1 hover:bg-[#161b22]"
          >
            <span>{item.type === "folder" ? "[DIR]" : "[FILE]"}</span>
            <span className="truncate">{item.path}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadmeBlock;
