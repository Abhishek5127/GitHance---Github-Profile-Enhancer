"use client";

import { useDroppable } from "@dnd-kit/core";

export default function BuilderCanvas({ children }) {
  const { setNodeRef } = useDroppable({
    id: "canvas",
  });

  return (
    <div
      ref={setNodeRef}
      className="flex-1 p-4 min-h-screen bg-gray-50 rounded"
    >
      <h3 className="font-bold mb-4">Your Profile Layout</h3>

      {children}
    </div>
  );
}
