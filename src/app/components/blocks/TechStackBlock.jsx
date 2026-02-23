"use client";

import {
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  getTechIconUrl,
  normalizeTechStackData,
} from "@/app/lib/techStackCatalog";

export default function TechStackBlock({ item }) {
  const normalized = normalizeTechStackData(item?.data, { includeDefaults: true });

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-white">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Tech Stack</p>
          <p className="mt-1 text-sm text-white/70">
            {normalized.items.length} technologies selected
          </p>
        </div>

        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          Layout: {normalized.variant || "categorized"}
        </div>
      </div>

      <p className="mt-3 text-xs text-white/50">
        Use the edit button on this block to scan repositories and manage icons.
      </p>

      <div className="mt-4 space-y-4">
        {TECH_STACK_CATEGORY_ORDER.map((category) => {
          const categoryItems = normalized[category] || [];
          if (!categoryItems.length) return null;

          return (
            <div key={category}>
              <p className="text-sm font-semibold text-white/90">
                {TECH_STACK_CATEGORY_LABELS[category]}:
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {categoryItems.map((tech) => (
                  <div
                    key={`${category}-${tech.id}-${tech.name}`}
                    className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115] px-2 py-1.5"
                    title={tech.name}
                  >
                    <img
                      src={getTechIconUrl(tech)}
                      alt={tech.name}
                      width={24}
                      height={24}
                      className="h-6 w-6 object-contain"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                    <span className="text-xs text-white/80">{tech.name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {!normalized.items.length ? (
        <div className="mt-4 rounded-xl border border-white/10 bg-[#0f1115] p-3 text-sm text-white/60">
          No technologies added yet.
        </div>
      ) : null}
    </div>
  );
}
