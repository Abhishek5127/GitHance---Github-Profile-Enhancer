"use client";
//repo check
import TemplateItem from "./TemplateItem";
import { PROFILE_TEMPLATES } from "../../lib/profileTemplates";

export default function Sidebar({ onSelectBlock }) {
  return (
    <aside className="w-72 border-r border-white/10 bg-[#0d1117] p-4 text-white">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
        <p className="text-xs uppercase tracking-[0.25em] text-white/40">Blocks</p>
        <h3 className="mt-2 text-lg font-semibold">Components</h3>
      </div>

      <div className="mt-4 space-y-2">
        {PROFILE_TEMPLATES.map((t) => (
          <TemplateItem
            key={t.id}
            template={t}
            onSelect={onSelectBlock}
          />
        ))}
      </div>

      <p className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/60">
        Click a component to choose its style and customize it.
      </p>
    </aside>
  );
}
