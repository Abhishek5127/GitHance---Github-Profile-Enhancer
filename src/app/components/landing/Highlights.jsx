const stats = [
  { label: "Profiles shipped", value: "1.2k" },
  { label: "README exports", value: "18k" },
  { label: "Avg. setup", value: "3 min" },
];

export default function Highlights() {
  return (
    <section id="product" className="mx-auto w-full max-w-6xl px-4 pb-20">
      <div className="grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 via-white/10 to-white/5 p-8 text-white md:grid-cols-[1.3fr_0.7fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Why GitHance</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            A clean, consistent brand for every GitHub surface.
          </h2>
          <p className="mt-4 text-sm text-white/60">
            GitHance keeps your profile, repos, and documentation aligned. It is a studio for developers who want
            clarity and polish without spending hours on design.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Composable blocks</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Instant previews</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Clean markdown</span>
          </div>
        </div>
        <div className="grid gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-white/10 bg-[#0f1115] p-5">
              <div className="text-2xl font-semibold text-white">{stat.value}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.2em] text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}