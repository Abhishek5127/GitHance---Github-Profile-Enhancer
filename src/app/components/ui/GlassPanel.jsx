const joinClasses = (...values) => values.filter(Boolean).join(" ");

export default function GlassPanel({
  as: Component = "div",
  className = "",
  glowClassName = "",
  children,
}) {
  return (
    <Component
      className={joinClasses(
        "relative overflow-hidden rounded-[28px] border border-white/14 bg-white/[0.045] shadow-[0_24px_90px_rgba(0,0,0,0.5)] backdrop-blur-xl",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/18 via-transparent to-transparent opacity-60" />
      <div
        className={joinClasses(
          "pointer-events-none absolute -left-20 -top-20 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl",
          glowClassName,
        )}
      />
      <div className="relative">{children}</div>
    </Component>
  );
}
