"use client";

import { useState } from "react";
import {
  DndContext,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

export default function Sidebar() {
  const [items, setItems] = useState(["H1", "H2", "H3"]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = items.indexOf(active.id);
    const newIndex = items.indexOf(over.id);

    const newArray = [...items];
    newArray.splice(oldIndex, 1);
    newArray.splice(newIndex, 0, active.id);

    setItems(newArray);
  };

  return (
    <div className="flex flex-col h-screen w-72 bg-[#0d1117] border-r border-[#30363d]">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={handleDragEnd}
      >
        <div className="p-4">
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <ul className="space-y-1 text-sm font-medium text-[#c9d1d9]">
              {items.map((item) => (
                <SortableItem key={item} id={item} />
              ))}
            </ul>
          </SortableContext>
        </div>
      </DndContext>
    </div>
  );
}

function SortableItem({ id }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="px-3 py-2 rounded hover:bg-[#21262d] cursor-pointer"
    >
      {id}
    </li>
  );
}
