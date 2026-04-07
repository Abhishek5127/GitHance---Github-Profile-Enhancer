"use client";

export default function TemplateItem({ template, onSelect }) {
  return (
    <button
      onClick={() => onSelect(template.id)}
      className="
        w-full min-h-11 text-left
        rounded-2xl p-3
        border border-white/10
        bg-white/5
        transition
        cursor-pointer
        select-none
        hover:bg-white/10
      "
    >
      <div className="text-sm font-medium text-white/90">
        {template.title}
      </div>
    </button>
  );
}