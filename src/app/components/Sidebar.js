"use client";

import TemplateItem from "./TemplateItem";
import { PROFILE_TEMPLATES } from "@/app/lib/profileTemplates";

export default function Sidebar() {
  return (
    <aside className="w-72 p-4 bg-[#0d1117] text-white border-r border-[#222629]">
      <h3 className="font-semibold mb-4">Components</h3>

      <div className="space-y-2">
        {PROFILE_TEMPLATES.map((t) => (
          <TemplateItem key={t.id} template={t} />
        ))}
      </div>
      
      <p className="mt-6 text-xs text-gray-400">
        Drag a component into the canvas to add it to your profile README.
      </p>
    </aside>
  );
}
