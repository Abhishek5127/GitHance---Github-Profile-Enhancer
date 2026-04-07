import Link from "next/link";
import LandingFeatureLink from "./LandingFeatureLink";

export const HOME_FAQS = [
  {
    question: "What is GitHance?",
    answer:
      "GitHance is a public workspace for developers who want to generate GitHub READMEs, improve profile READMEs, analyze repositories, compare profiles, and ship clearer project documentation from one place.",
  },
  {
    question: "How does GitHance help with GitHub README generation?",
    answer:
      "GitHance analyzes repository structure, key files, dependencies, and documentation gaps before it suggests README content, so the result is more accurate than a generic template-only README generator.",
  },
  {
    question: "Can GitHance analyze repository security and quality signals?",
    answer:
      "Yes. GitHance includes repository security analysis that helps developers review important codebase signals before publishing or updating a README.",
  },
  {
    question: "Who should use GitHance?",
    answer:
      "GitHance is built for solo developers, open-source maintainers, developer advocates, and engineering teams that want stronger documentation, better GitHub discoverability, and a more consistent developer brand.",
  },
  {
    question: "Do I need an account or paid plan to use GitHance?",
    answer:
      "No. GitHance runs as an open workspace, so you can enter a public GitHub username and move straight into the profile builder, README tooling, profile comparison, repository analysis, and security review flows.",
  },
];

export default function FaqSection() {
  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-4"
    >
      <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.34)] sm:p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">FAQ</p>
          <h2 id="faq-heading" className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Straight answers for developers evaluating GitHub documentation tools.
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/65 sm:text-base">
            These are the questions developers ask before choosing a GitHub README generator, repository analyzer,
            or profile builder. GitHance is designed to answer them clearly and get you moving faster.
          </p>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {HOME_FAQS.map((faq) => (
            <article
              key={faq.question}
              className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.22)]"
            >
              <h3 className="text-xl font-semibold text-white">{faq.question}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{faq.answer}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/product"
            className="rounded-full bg-[#ff7a1a] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
          >
            Explore product overview
          </Link>
          <LandingFeatureLink
            href="/profile-builder"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            disabledClassName="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/35"
          >
            Open profile builder
          </LandingFeatureLink>
          <LandingFeatureLink
            href="/analyze"
            className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            disabledClassName="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-5 py-2.5 text-sm font-semibold text-white/35"
          >
            Try repository preview
          </LandingFeatureLink>
        </div>
      </div>
    </section>
  );
}
