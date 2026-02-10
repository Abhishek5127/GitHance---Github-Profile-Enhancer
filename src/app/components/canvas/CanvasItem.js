"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContributionGraph from "../blocks/ContributionGraph";
import HeaderBlock from "../blocks/HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "../blocks/TechStackBlock";

export default function CanvasItem({ item, setItems }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderInner = () => {
    switch (item.type) {
      case "header":
        return <HeaderBlock item={item} setItems={setItems} />;

      case "bio":
        return <BioBlock item={item} setItems={setItems} />;

      case "skills":
        return <TechStackBlock item={item} setItems={setItems} />;

      case "commits":
        return <div>Commit Graph</div>;

      case "contribution":
        return <ContributionGraph item={item} />;

      default:
        return <div>{item.type}</div>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {renderInner()}
    </div>
  );
}
