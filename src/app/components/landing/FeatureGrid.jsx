const cards = [
  {
    title: "Profile Builder",
    description: "Assemble sections with drag and drop controls and publish to your GitHub profile in minutes.",
  },
  {
    title: "README Studio",
    description: "Generate structure, add screenshots, and keep docs aligned with your repo in one flow.",
  },
  {
    title: "Repository Insights",
    description: "Find important files faster and onboard new contributors with clarity.",
  },
  {
    title: "Templates",
    description: "Start from curated layouts that match developer portfolios, startups, or OSS teams.",
  },
  {
    title: "Automation",
    description: "Sync your profile README with recent work and keep highlights fresh.",
  },
  {
    title: "Team Workspaces",
    description: "Maintain consistent branding across multiple repos and contributors.",
  },
];

export default function FeatureGrid() {
  return (
    <section id="solutions" className="mx-auto w-full max-w-6xl px-4 pb-20">
      <div className="flex items-end justify-between gap-6">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-white/40">Solutions</p>
          <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Everything you need to ship developer branding.
          </h2>
        </div>
        <a
          href="#"
          className="hidden rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10 md:inline-flex"
        >
          Explore all
        </a>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card, index) => (
          <div
            key={card.title}
            className="group rounded-3xl border border-white/10 bg-white/5 p-6 text-white/80 shadow-[0_30px_90px_rgba(0,0,0,0.35)] transition hover:-translate-y-1 hover:border-white/20"
          >
            <div className="text-xs text-white/50">0{index + 1}</div>
            <h3 className="mt-4 text-xl font-semibold text-white">{card.title}</h3>
            <p className="mt-3 text-sm text-white/60">{card.description}</p>
            <div className="mt-6 h-px w-full bg-gradient-to-r from-white/20 via-white/5 to-transparent" />
            <button className="mt-4 text-sm font-semibold text-white/70 transition group-hover:text-white">
              Learn more
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}