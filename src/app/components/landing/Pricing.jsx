import React from 'react'

const Pricing = () => {
  return (
    <div>
        <section id="pricing" className="mx-auto w-full max-w-7xl px-4 pb-24">
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
              <button className="rounded-full cursor-pointer bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-white/90">
                Get started
              </button>
              <button className="rounded-full cursor-pointer border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10">
                Talk to sales
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0f1115] p-6">
            <div className="flex items-center justify-between text-sm text-white/60">
              <span>Starter</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs">Most popular</span>
            </div>
            <div className="mt-4 text-3xl font-semibold text-white">$10</div>
            <p className="mt-2 text-sm text-white/60">Everything you need to get a polished GitHub presence.</p>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Profile builder and templates</li>
              <li>README structure and preview</li>
              <li>Repository insights</li>
            </ul>
            <button className="mt-6 w-full cursor-pointer rounded-full bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]">
              Start free
            </button>
          </div>
        </div>
      </section>      
    </div>
  )
}

export default Pricing
