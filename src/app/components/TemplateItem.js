"use client";

import { useDraggable } from "@dnd-kit/core";

/**
 * TemplateItem is a draggable source (a template you can drag to the canvas).
 * We mark its drag data with { source: 'template', templateId } so onDragEnd handler can detect it.
 */
export default function TemplateItem({ template }) {
  const id = `template:${template.id}`; // e.g. "template:header"

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
      className="p-3 bg-[#111418] rounded cursor-grab hover:bg-[#16191d]"
    >
      {template.title}
    </div>
  );
}
