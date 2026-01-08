"use client";

/**
 * Sidebar item for block categories (Header, Bio, etc.)
 * Click-based, NOT draggable.
 */
export default function TemplateItem({ template, onSelect }) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className="
        w-full text-left
        p-3 rounded
        bg-[#111418]
        hover:bg-[#16191d]
        transition
        cursor-pointer
        select-none
      "
    >
      <div className="text-sm font-medium text-white">
        {template.title}
      </div>
    </button>
  );
}
