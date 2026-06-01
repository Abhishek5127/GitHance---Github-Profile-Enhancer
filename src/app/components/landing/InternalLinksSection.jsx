import LandingFeatureLink from "./LandingFeatureLink";

const linkGroups = [
  {
    title: "GitHub README Tools",
    description:
      "Use a dedicated GitHub README generator route for repository README creation, markdown preview, and documentation cleanup.",
    href: "/github-readme-generator",
    cta: "Open README generator",
  },
  {
    title: "GitHub Profile Builder",
    description:
      "Build a profile README with reusable blocks, visual sections, and live preview tools designed for developer branding.",
    href: "/profile-builder",
    cta: "Launch profile builder",
  },
  {
    title: "Developer Profile Comparison",
    description:
      "Compare two GitHub profiles across activity, quality, diversity, and popularity metrics with a dedicated comparison route.",
    href: "/profile-compare",
    cta: "Compare profiles",
  },
  {
    title: "Public GitHub workspace",
    description:
      "GitHance runs as an open workspace, so every README, security, and profile tool starts from the GitHub username you enter on the landing page.",
    href: "/product",
    cta: "Explore the product",
  },
];

export default function InternalLinksSection() {
  return (
    <section
      aria-labelledby="internal-links-heading"
      className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-4"
    >
      <div className="rounded-[32px] border border-white/10 bg-[#111418] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.32)] sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-cyan-300">Explore GitHance</p>
          <h2 id="internal-links-heading" className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Follow the route that matches your next GitHub improvement task.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">
            These routes are intentionally linked to strengthen crawlability, help search engines understand the product,
            and give developers clear next steps from documentation to repository analysis.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {linkGroups.map((group) => (
            <article
              key={group.title}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
            >
              <h3 className="text-xl font-semibold text-white">{group.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/66">{group.description}</p>
              <LandingFeatureLink
                href={group.href}
                className="mt-5 inline-flex items-center rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                disabledClassName="mt-5 inline-flex cursor-not-allowed items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-white/35"
              >
                {group.cta}
              </LandingFeatureLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
