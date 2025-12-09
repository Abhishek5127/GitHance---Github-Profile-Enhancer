"use client";

import { useDraggable } from "@dnd-kit/core";

/**
 * A draggable source in the sidebar.
 * data: { source: 'template', templateId }
 */
export default function TemplateItem({ template }) {
  const id = `template:${template.id}`; // unique draggable id

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id,
    data: { source: "template", templateId: template.id },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="p-3 bg-[#111418] rounded cursor-grab hover:bg-[#16191d] select-none"
    >
      {template.title}
    </div>
  );
}
