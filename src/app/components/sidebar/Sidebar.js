"use client";

import TemplateItem from "./TemplateItem";
import { PROFILE_TEMPLATES } from "../../lib/profileTemplates";

export default function Sidebar({ onSelectBlock }) {
  return (
    <aside className="w-72 p-4 bg-[#0d1117] text-white border-r border-[#222629]">
      <h3 className="font-semibold mb-4">Components</h3>

      <div className="space-y-2">
        {PROFILE_TEMPLATES.map((t) => (
          <TemplateItem
            key={t.id}
            template={t}
            onSelect={onSelectBlock}
          />
        ))}
      </div>

      <p className="mt-6 text-xs text-gray-400">
        Click a component to choose its style and customize it.
      </p>
    </aside>
  );
}
