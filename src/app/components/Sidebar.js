"use client";

import { useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import SortableItem from "./DraggableBlock";

export default function Sidebar() {
  const [headings, setHeadings] = useState([
    { id: "1", title: "Heading 1" },
    { id: "2", title: "Heading 2" },
    { id: "3", title: "Heading 3" },
  ]);

  // sensors → must have for dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Reorder items when drag ends
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = headings.findIndex((h) => h.id === active.id);
    const newIndex = headings.findIndex((h) => h.id === over.id);

    const newArray = arrayMove(headings, oldIndex, newIndex);
    setHeadings(newArray);
  };

  return (
    <div className="w-72 p-4 bg-[#0d1117] h-screen text-white">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={headings.map((h) => h.id)}
          strategy={verticalListSortingStrategy}
        >
          {headings.map((heading) => (
            <SortableItem key={heading.id} id={heading.id} title={heading.title} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
