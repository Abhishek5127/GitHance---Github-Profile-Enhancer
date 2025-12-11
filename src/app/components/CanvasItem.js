"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * Renders each canvas item and makes it sortable.
 */
export default function CanvasItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderInner = () => {
    switch (item.type) {
      case "header":
        return <div className="text-xl font-bold">👋 Hi, I'm Your Name</div>;
      case "bio":
        return <div>A short bio about you — talk about what you build.</div>;
      case "skills":
        return (
          <div>
            <strong>Tech stack:</strong> React · Node.js · Python
          </div>
        );

       case "commits":
        return(
          <div>
            Commit Graph
          </div>
        )
      default:
        return <div>{item.type}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 mb-3 bg-white/5 rounded border"
    >
      {renderInner()}
    </div>
  );
}
