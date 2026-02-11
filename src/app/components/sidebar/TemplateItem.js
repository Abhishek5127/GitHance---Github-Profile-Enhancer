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
        p-3 rounded-2xl
        border border-white/10
        bg-white/5
        hover:bg-white/10
        transition
        cursor-pointer
        select-none
      "
    >
      <div className="text-sm font-medium text-white/90">
        {template.title}
      </div>
    </button>
  );
}
