"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import CanvasItem from "./CanvasItem";
export default function Canvas({ items, setItems, readmeData, setReadmeData }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[600px] p-4 relative rounded border-dashed border ${isOver ? "border-blue-500 bg-blue-50/10" : "border-gray-700 bg-white/2"
        }`}
    >
      <div className="absolute right-1 top-1 flex gap-2">
        <button onClick={()=>setReadmeData(null)} className="bg-gray-700 text-white border-2 font-bold hover:bg-gray-800 cursor-pointer p-2 rounded-2xl">Create</button>
        <button onClick={()=>setItems([])} className="rounded-2xl bg-red-600 hover:bg-red-900 border-2 p-1 cursor-pointer">Clear</button>
        </div>
      {/* README SECTION */}
      {readmeData ? (
        <article
          className="markdown-body"
          dangerouslySetInnerHTML={{ __html: readmeData }}
        />
      ) : items?.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          No README found
        </div>
      ) : null}

      {/* DRAGGABLE ITEMS */}
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {items.map((item) => (
          <CanvasItem key={item.id} item={item} setItems={setItems} />
        ))}
      </SortableContext>
    </div>
  );
}