"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CanvasItem from "./CanvasItem";
import { useDroppable } from "@dnd-kit/core";

/**
 * Canvas: droppable + sortable area
 * props:
 *   items: canvas array
 *   setItems: setter
 */
export default function Canvas({ items, setItems }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div>
      <div
        ref={setNodeRef}
        className={`min-h-[300px] p-4 rounded border-dashed border ${
          isOver ? "border-blue-500 bg-blue-50/10" : "border-gray-700 bg-white/2"
        }`}
      >
        {items.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            Drop components here
          </div>
        )}

        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <CanvasItem key={item.id} item={item} setItems={setItems} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}
