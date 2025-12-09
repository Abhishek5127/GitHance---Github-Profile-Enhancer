"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import CanvasItem from "./CanvasItem";
import { useDroppable } from "@dnd-kit/core";

/**
 * Canvas is the drop area. It registers a droppable id "canvas" so we
 * can detect drops on empty canvas or between items.
 *
 * props:
 *  - items: array of canvas items
 *  - setItems: setter to manage items (reorder, insert, delete)
 */
export default function Canvas({ items, setItems }) {
  const { setNodeRef, isOver } = useDroppable({ id: "canvas" });

  return (
    <div>
      <div
        ref={setNodeRef}
        className={`min-h-[300px] p-4 rounded border border-dashed ${
          isOver ? "border-blue-500 bg-blue-50/20" : "border-gray-200 bg-white/5"
        }`}
      >
        {items.length === 0 && (
          <div className="py-12 text-center text-gray-400">Drop components here</div>
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
