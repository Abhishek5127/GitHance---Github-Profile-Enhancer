"use client";

import { useDndContext } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import ContributionGraph from "../blocks/ContributionGraph";
import HeaderBlock from "../blocks/HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "../blocks/TechStackBlock";
import SocialLinksBlock from "../blocks/SocialLinksBlock";
import GraphicComponentBlock from "../blocks/GraphicComponentBlock";
import RepoCommitStatsBlock from "../blocks/RepoCommitStatsBlock";
import SectionBlock from "../blocks/SectionBlock";
import FooterBannerBlock from "../blocks/FooterBannerBlock";
import {
  canItemAcceptStickers,
  normalizeStickerAssignments,
} from "@/app/lib/stickerCatalog";

const EDITABLE_ITEM_TYPES = [
  "header",
  "bio",
  "skills",
  "social",
  "graphic",
  "section",
  "commitStat",
  "contribution",
  "footer",
];

export default function CanvasItem({
  item,
  setItems,
  onEditItem,
  defaultUsername = "",
  prefetchedCommitStatsSnapshot = null,
  prefetchedCommitStatsVersion = 0,
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });
  const { active } = useDndContext();

  const canEdit = Boolean(onEditItem) && EDITABLE_ITEM_TYPES.includes(item.type);
  const acceptsStickers = canItemAcceptStickers(item.type);
  const isStickerDragging = active?.data?.current?.source === "sticker-template";
  const stickerAssignments = normalizeStickerAssignments(item?.data?.stickers);

  const normalizedTransform = transform
    ? { ...transform, scaleX: 1, scaleY: 1 }
    : null;

  const style = {
    transform: CSS.Transform.toString(normalizedTransform),
    transition,
  };

  const handleDelete = (event) => {
    event.stopPropagation();
    setItems((prev) => prev.filter((entry) => entry.id !== item.id));
  };

  const handleEdit = (event) => {
    event.stopPropagation();
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

      case "social":
        return <SocialLinksBlock item={item} setItems={setItems} />;

      case "graphic":
        return <GraphicComponentBlock item={item} setItems={setItems} />;

      case "commitStat":
      case "commits":
        return (
          <RepoCommitStatsBlock
            item={item}
            setItems={setItems}
            stickerAssignments={stickerAssignments}
            showStickerDropSlots={isStickerDragging && acceptsStickers}
            defaultUsername={defaultUsername}
            prefetchedSnapshot={prefetchedCommitStatsSnapshot}
            prefetchedSnapshotVersion={prefetchedCommitStatsVersion}
          />
        );

      case "section":
        return (
          <SectionBlock
            item={item}
            setItems={setItems}
            onEditItem={onEditItem}
            stickerAssignments={stickerAssignments}
            showStickerDropSlots={isStickerDragging && acceptsStickers}
            defaultUsername={defaultUsername}
            prefetchedCommitStatsSnapshot={prefetchedCommitStatsSnapshot}
            prefetchedCommitStatsVersion={prefetchedCommitStatsVersion}
          />
        );

      case "contribution":
        return (
          <ContributionGraph
            item={item}
            setItems={setItems}
            stickerAssignments={stickerAssignments}
            showStickerDropSlots={isStickerDragging && acceptsStickers}
            defaultUsername={defaultUsername}
          />
        );

      case "footer":
        return <FooterBannerBlock item={item} setItems={setItems} />;

      default:
        return <div>{item.type}</div>;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative mb-1 w-full"
      {...attributes}
      {...listeners}
    >
      <div className="pointer-events-none absolute right-3 top-3 z-40 flex translate-y-1 gap-2 opacity-0 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100">
        {canEdit ? (
          <button
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleEdit}
            className="rounded-md border border-white/20 bg-[#0f1115]/95 p-1.5 text-white/80 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-white"
            title="Edit item"
            aria-label="Edit item"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        ) : null}
        <button
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleDelete}
          className="rounded-md border border-red-500/40 bg-red-500/25 p-1.5 text-red-200 shadow-[0_6px_18px_rgba(0,0,0,0.35)] hover:text-red-100"
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

      <div className="relative">
        {renderInner()}
      </div>
    </div>
  );
}
