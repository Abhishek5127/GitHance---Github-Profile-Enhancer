export default function ProBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-[#ff7a1a]/35 bg-[#ff7a1a]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#ffd6b7] ${className}`}
    >
      Pro
    </span>
  );
}
