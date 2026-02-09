import LandingNav from "./components/landing/LandingNav";
import Hero from "./components/landing/Hero";
import Highlights from "./components/landing/Highlights";
import FeatureGrid from "./components/landing/FeatureGrid";
import Workflow from "./components/landing/Workflow";
import Footer from "./components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.35),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.25),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_60%)] blur-3xl" />
        <LandingNav />
        <Hero />
      </div>

      <Highlights />
      <FeatureGrid />
      <Workflow />

      <section id="pricing" className="mx-auto w-full max-w-6xl px-4 pb-24">
        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-white md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">Launch</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Start free. Upgrade when you are ready.
            </h2>
            <p className="mt-4 text-sm text-white/60">
              GitHance scales from personal profiles to team workspaces. Choose the plan that fits your workflow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
                Get started
              </button>
              <button className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                Talk to sales
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1115] p-6">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Starter</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">Most popular</span>
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">$0</div>
            <p className="mt-2 text-sm text-white/60">Everything you need to get a polished GitHub presence.</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Profile builder and templates</li>
              <li>README structure and preview</li>
              <li>Repository insights</li>
            </ul>
            <button className="mt-6 w-full rounded-full bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]">
              Start free
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}