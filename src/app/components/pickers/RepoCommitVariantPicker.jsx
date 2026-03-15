"use client";

import { useState } from "react";
import { REPO_COMMIT_STAT_ITEMS } from "@/app/lib/repoCommitCatalog";

export default function RepoCommitVariantPicker({
  open,
  onClose,
  onSave,
  submitLabel = "Add to Canvas",
}) {
  const [selectedItems, setSelectedItems] = useState(
    () => new Set(REPO_COMMIT_STAT_ITEMS.map((item) => item.id))
  );

  const selectedCount = selectedItems.size;

  const resetState = () => {
    setSelectedItems(new Set(REPO_COMMIT_STAT_ITEMS.map((item) => item.id)));
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const toggleItem = (itemId) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedItems(new Set(REPO_COMMIT_STAT_ITEMS.map((item) => item.id)));
  };

  const handleClearAll = () => {
    setSelectedItems(new Set());
  };

  const handleAddToCanvas = async () => {
    if (!selectedCount) return;

    await onSave({
      itemIds: REPO_COMMIT_STAT_ITEMS.map((item) => item.id).filter((id) =>
        selectedItems.has(id)
      ),
    });
    handleClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 left-72 right-0 z-50 flex justify-start bg-black/55">
      <div className="relative h-full w-[640px] overflow-scroll border-r border-white/10 bg-[#0d1117] p-4">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-white/40">Repo Commit Stats</p>
            <h3 className="mt-1 text-lg font-semibold text-white">Choose the stats to add</h3>
          </div>
          <button
            onClick={handleClose}
            className="cursor-pointer rounded-lg border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="rounded-2xl border border-cyan-300/35 bg-[#081224]/90 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">
                Available Stats
              </p>
              <p className="mt-1 text-xs text-cyan-100/70">
                Select one or combine several compact stat cards.
              </p>
            </div>
            <p className="text-xs text-cyan-100/80">{selectedCount} selected</p>
          </div>

          <div className="mb-3 flex gap-2">
            <button
              onClick={handleSelectAll}
              className="rounded-lg border border-cyan-300/35 px-3 py-1 text-xs text-cyan-100/85 hover:text-cyan-50"
            >
              Select all
            </button>
            <button
              onClick={handleClearAll}
              className="rounded-lg border border-cyan-300/35 px-3 py-1 text-xs text-cyan-100/85 hover:text-cyan-50"
            >
              Clear
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {REPO_COMMIT_STAT_ITEMS.map((item) => {
              const selected = selectedItems.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    selected
                      ? "border-cyan-200/75 bg-cyan-300/15 text-cyan-50"
                      : "border-cyan-400/20 bg-[#0b1426] text-cyan-100/80 hover:border-cyan-300/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.label}</span>
                    <span
                      className={`h-4 w-4 rounded-full border ${
                        selected
                          ? "border-cyan-100 bg-cyan-300/90"
                          : "border-cyan-100/35 bg-transparent"
                      }`}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-inherit/85">
                    {item.description || "Dynamic live stat block"}
                  </p>
                  <div className="mt-2 rounded-md border border-cyan-200/15 bg-[#050a14] p-2">
                    <div className="h-1.5 w-24 rounded bg-cyan-200/70" />
                    <div className="mt-1 h-1.5 w-16 rounded bg-cyan-300/45" />
                    <div className="mt-2 h-5 rounded border border-cyan-300/20 bg-cyan-300/10" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-4">
          <button
            onClick={handleClose}
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-white/75 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToCanvas}
            disabled={!selectedCount}
            className="rounded-xl bg-[#00e5ff] px-4 py-2 text-sm font-semibold text-[#031016] transition hover:bg-[#6bf3ff] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
