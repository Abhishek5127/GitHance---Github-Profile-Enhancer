"use client";

import { useDraggable } from "@dnd-kit/core";
import { PROFILE_COMPONENTS } from "@/app/lib/profileComponents";

export default function Sidebar() {
  return (
    <div className="w-64 border-r p-4">
      <h3 className="font-bold mb-4">Components</h3>

      {PROFILE_COMPONENTS.map((item) => (
        <DraggableItem key={item.id} id={item.id} title={item.title} />
      ))}
    </div>
  );
}

function DraggableItem({ id, title }) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="p-3 mb-3 bg-gray-100 border rounded cursor-pointer"
    >
      {title}
    </div>
  );
}
