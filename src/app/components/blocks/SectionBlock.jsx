"use client";

import { useDroppable } from "@dnd-kit/core";
import HeaderBlock from "./HeaderBlock";
import BioBlock from "../BioBlock";
import TechStackBlock from "./TechStackBlock";
import RepoCommitStatsBlock from "./RepoCommitStatsBlock";
import ContributionGraph from "./ContributionGraph";
import {
  buildSectionSlotDropId,
  getSectionVariantById,
} from "@/app/lib/sectionCatalog";

function SectionSlot({
  sectionId,
  slotIndex,
  slotItem,
  slotMinHeight,
}) {
  const dropId = buildSectionSlotDropId(sectionId, slotIndex);
  const { isOver, setNodeRef } = useDroppable({ id: dropId });

  const baseClass = isOver
    ? "border-cyan-300/65 bg-cyan-300/10"
    : "border-white/15 bg-[#0d1524]";

  const renderSlotItem = () => {
    if (!slotItem) {
      return (
        <div className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-center text-xs text-white/55">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 text-xl leading-none text-white/65">
            +
          </div>
          <p>Drop a canvas block here</p>
          <p className="text-[10px] text-white/40">Add from sidebar first, then drag into slot.</p>
        </div>
      );
    }

    switch (slotItem.type) {
      case "header":
        return <HeaderBlock item={slotItem} />;
      case "bio":
        return <BioBlock item={slotItem} />;
      case "skills":
        return <TechStackBlock item={slotItem} />;
      case "commitStat":
      case "commits":
        return <RepoCommitStatsBlock item={slotItem} />;
      case "contribution":
        return <ContributionGraph item={slotItem} />;
      default:
        return (
          <div className="rounded-xl border border-white/15 bg-black/30 p-3 text-xs text-white/70">
            Unsupported item type: {slotItem.type}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl border p-2 transition ${baseClass}`}
      style={{ minHeight: `${slotMinHeight}px` }}
    >
      <div className="h-full w-full overflow-hidden [&>*]:h-full [&>*]:w-full">
        {renderSlotItem()}
      </div>
    </div>
  );
}

export default function SectionBlock({ item }) {
  const variant = getSectionVariantById(item?.data?.variantId);
  const slots = Array.isArray(item?.data?.slots) ? item.data.slots : [];
  const totalSlots = Number(variant.slotCount || 0);
  const resolvedSlots =
    slots.length >= totalSlots
      ? slots.slice(0, totalSlots)
      : [...slots, ...Array.from({ length: totalSlots - slots.length }, () => null)];

  const gridClass =
    Number(variant.canvasColumns || 1) === 3
      ? "grid-cols-1 md:grid-cols-3"
      : Number(variant.canvasColumns || 1) === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1";

  return (
    <div className="rounded-2xl border border-cyan-300/25 bg-[linear-gradient(135deg,rgba(6,13,24,0.95),rgba(5,9,20,0.9))] p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Section</p>
          <p className="text-sm font-semibold text-white">{variant.title}</p>
        </div>
        <p className="text-[11px] text-cyan-100/70">{totalSlots} slots</p>
      </div>

      <div className={`grid gap-2 ${gridClass}`}>
        {resolvedSlots.map((slotItem, slotIndex) => (
          <SectionSlot
            key={`${item.id}-slot-${slotIndex}`}
            sectionId={item.id}
            slotIndex={slotIndex}
            slotItem={slotItem}
            slotMinHeight={Number(variant.canvasSlotMinHeight || 200)}
          />
        ))}
      </div>
    </div>
  );
}
