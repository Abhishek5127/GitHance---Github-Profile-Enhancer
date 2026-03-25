import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";

const releases = [
  {
    date: "March 2026",
    version: "v1.8.0",
    updates: [
      "Introduced dedicated Product, Solutions, Process, Pricing, and Changelog routes from the main navbar.",
      "Refined landing information architecture to support page-level navigation.",
      "Improved mobile behavior in top navigation and route active-state handling.",
    ],
  },
  {
    date: "February 2026",
    version: "v1.7.0",
    updates: [
      "Redesigned FeatureGrid into a GrowthCard-first product surface.",
      "Improved responsive behavior for key landing sections.",
      "Strengthened profile/readme visual storytelling blocks.",
    ],
  },
  {
    date: "January 2026",
    version: "v1.6.0",
    updates: [
      "Expanded repository analysis modules and route coverage.",
      "Shipped comparison and security-oriented workflow improvements.",
      "Polished section theming across landing experiences.",
    ],
  },
];

const roadmap = [
  "Collaborative workflow state for teams",
  "Richer publishing diagnostics before release",
  "Template versioning for README systems",
  "Release note generation from repository context",
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-8 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(99,102,241,0.16),_transparent_68%)] blur-3xl" />
        <LandingNav />
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="rounded-[32px] border border-white/10 bg-[#101418] p-6 shadow-[0_30px_110px_rgba(0,0,0,0.42)] sm:p-8 lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-indigo-300">Changelog</p>
          <h1 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Product evolution, shipped in clear iterations.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            A rolling view of how GitHance is evolving across product surfaces, workflow quality, and developer
            experience.
          </p>
        </section>

        <section className="relative mt-10">
          <div className="absolute left-5 top-5 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-indigo-300/70 via-white/20 to-transparent sm:block" />
          <div className="grid gap-4">
            {releases.map((release) => (
              <article
                key={release.version}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">{release.date}</p>
                    <h2 className="mt-2 text-2xl font-semibold text-white">{release.version}</h2>
                  </div>
                  <span className="rounded-full border border-indigo-300/35 bg-indigo-300/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200">
                    Release
                  </span>
                </div>

                <ul className="mt-5 space-y-2 text-sm text-white/72">
                  {release.updates.map((update) => (
                    <li key={update} className="rounded-xl border border-white/10 bg-[#0b0d0f]/75 px-3 py-2">
                      {update}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[30px] border border-white/10 bg-[#111418] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/45">Next Up</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {roadmap.map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 px-4 py-3 text-sm text-white/68">
                {item}
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
