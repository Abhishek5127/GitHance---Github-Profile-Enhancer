"use client";

export default function SectionEditorCard({
  section,
  disabled = false,
  aiBusy = false,
  onToggle,
  onContentChange,
  onReset,
  onRequestAi,
}) {
  const id = String(section?.id || "");
  const title = String(section?.title || "Section");
  const description = String(section?.description || "");
  const enabled = Boolean(section?.enabled);
  const content = String(section?.content || "");

  return (
    <article className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-white/90">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-xs text-white/55">{description}</p>
          ) : null}
        </div>

        <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-white/70">
          <input
            type="checkbox"
            checked={enabled}
            disabled={disabled}
            onChange={() => onToggle?.(id)}
            className="h-4 w-4 rounded border-white/30 bg-transparent"
          />
          Include
        </label>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled || aiBusy}
          onClick={() => onRequestAi?.(id)}
          className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {aiBusy ? "AI generating..." : "AI Analyze Section"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onReset?.(id)}
          className="rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reset
        </button>
      </div>

      <textarea
        value={content}
        disabled={disabled || !enabled}
        onChange={(event) => onContentChange?.(id, event.target.value)}
        className="mt-3 min-h-36 w-full rounded-xl border border-white/10 bg-[#0f1115] p-3 font-mono text-xs text-white/85 outline-none transition focus:border-cyan-300/45"
        placeholder={`Write ${title.toLowerCase()} markdown...`}
      />
    </article>
  );
}

