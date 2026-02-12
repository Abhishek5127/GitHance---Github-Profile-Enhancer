"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContributionGraph from "../blocks/ContributionGraph";
import HeaderBlock from "../blocks/HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "../blocks/TechStackBlock";

export default function CanvasItem({ item, setItems, onEditItem }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    if (onEditItem) {
      onEditItem(item);
    }
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
    <div
      ref={setNodeRef}
      style={style}
      className="relative mb-1 w-full"
      {...attributes}
      {...listeners}
    >
      <div className="absolute right-3 top-3 z-20 flex gap-2">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleEdit}
          className="rounded-md border border-white/20 bg-[#0f1115]/90 p-1.5 text-white/80 hover:text-white"
          title="Edit item"
          aria-label="Edit item"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
          </svg>
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={handleDelete}
          className="rounded-md border border-red-500/40 bg-red-500/20 p-1.5 text-red-200 hover:text-red-100"
          title="Delete item"
          aria-label="Delete item"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </button>
      </div>
      {renderInner()}
    </div>
  );
}
