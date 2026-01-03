"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import CanvasItem from "./CanvasItem";
import ReadmeRenderer from "./blocks/ReadmeRenderer";

export default function Canvas({ items, setItems, readmeData }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[300px] p-4 rounded border-dashed border ${
        isOver ? "border-blue-500 bg-blue-50/10" : "border-gray-700 bg-white/2"
      }`}
    >
      {/* README SECTION */}
      {readmeData ? (
        <ReadmeRenderer readme={readmeData} />
      ) : (
        <div className="py-12 text-center text-gray-400">
          No README found. Create one.
        </div>
      )}

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
