"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import CanvasItem from "./CanvasItem";
import { useState } from "react";
import { useEffect } from "react";
export default function Canvas({
  readmeData,
  items,
  setItems,
  onEditItem,
}) {

  const [readmeDataContent, setreadmeDataContent] = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  useEffect(() => {
    setreadmeDataContent(readmeData);
  }, [readmeData]);

  useEffect(() => {
    if (items.length > 0) {
      setreadmeDataContent("");
    }
  }, [items]);

  return (
    <div
      ref={setNodeRef}
      className={`relative min-h-[600px] rounded-2xl border border-dashed p-1.5 ${
        isOver ? "border-cyan-400 bg-[#101722]" : "border-white/15 bg-[#0d1117]"
      }`}
    >
      <div className="h-14">
        <div className="absolute right-3 top-3 mb-3 flex gap-2">
          {readmeDataContent ? (
            <div className="flex gap-2">
              <button
                onClick={() => setreadmeDataContent("")}
                className="cursor-pointer rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setItems([]);
                  setreadmeDataContent("");
                }}
                className="cursor-pointer rounded-full border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30"
              >
                Clear
              </button>
            </div>
          ) : (
            <button
              onClick={() => setItems([])}
              className="cursor-pointer rounded-full border border-red-500/40 bg-red-500/20 px-4 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/30"
            >
              Clear
            </button>
          )}
        </div>
      </div>
      {/* README SECTION */}
      {readmeDataContent ? (
        <article
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: readmeDataContent }}
        />
      ) : items?.length === 0 ? (

        <div className="py-14 text-center text-sm text-white/50">
          Create Readme
        </div>
      ) : null}

      {/* DRAGGABLE ITEMS */}
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <CanvasItem
            key={item.id}
            item={item}
            setItems={setItems}
            onEditItem={onEditItem}
          />
        ))}

      </SortableContext>
    </div>
  );
}
