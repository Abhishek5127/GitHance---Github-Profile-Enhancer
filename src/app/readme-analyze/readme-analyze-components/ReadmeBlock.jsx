"use client";

import React from "react";

const ReadmeBlock = ({ tree = [] }) => {
  return (
    <div className="w-full max-w-3xl bg-[#0d1117] border border-[#30363d] rounded-md text-sm text-gray-200">
      
      <div className="px-4 py-2 border-b border-[#30363d] font-semibold">
        Repository Structure
      </div>

      <div className="px-4 py-3 space-y-1 max-h-[500px] overflow-y-auto">
        {tree.length === 0 && (
          <p className="text-gray-400">No files found</p>
        )}

        {tree.map((item, index) => (
          <div
            key={index}
            className="flex items-center gap-2 hover:bg-[#161b22] px-2 py-1 rounded"
          >
            <span>
              {item.type === "tree" ? "📁" : "📄"}
            </span>
            <span className="truncate">
              {item.path}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReadmeBlock;
