import Link from "next/link";
import { buildMetadata } from "./lib/seo";

export const metadata = buildMetadata({
  title: "404 Not Found",
  description: "The requested GitHance page could not be found.",
  path: "/404",
  noIndex: true,
});

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
];

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <header className="border-b border-white/10 bg-[#0b0d0f]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-xs font-bold">
              GH
            </span>
            <span className="text-base font-semibold tracking-wide">GitHance</span>
          </Link>

          <nav className="hidden items-center gap-2 sm:flex" aria-label="Quick links">
            {quickLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-14 sm:px-6 sm:py-20">
        <section className="w-full rounded-[28px] border border-white/10 bg-[#12161c] p-6 shadow-[0_26px_90px_rgba(0,0,0,0.35)] sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#ffb37f]">404 Not Found</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">This page does not exist.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            The link may be outdated or the URL may have been entered incorrectly. Continue from one of the main pages below.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Go to Home
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

