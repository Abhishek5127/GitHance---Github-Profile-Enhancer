"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContributionGraph from "../blocks/ContributionGraph";
import HeaderBlock from "../blocks/HeaderBlock";
import BioBlock from "../blocks/BioBlock";

export default function CanvasItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderInner = () => {
    switch (item.type) {
      case "header":
        return <HeaderBlock item={item} />;

      case "bio":
        return <BioBlock item={item} />;

      case "skills":
        return (
          <div>
            <strong>Tech stack:</strong> React · Node.js · Python
          </div>
        );

      case "commits":
        return <div>Commit Graph</div>;

      case "contribution":
        return <ContributionGraph item={item} />;

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
      
    >
      {renderInner()}
    </div>
  );
}
