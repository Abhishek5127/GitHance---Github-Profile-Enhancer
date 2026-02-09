const steps = [
  {
    title: "Connect GitHub",
    detail: "Authenticate once and sync your profile and repositories.",
  },
  {
    title: "Design the layout",
    detail: "Pick blocks, edit content, and preview every change instantly.",
  },
  {
    title: "Publish updates",
    detail: "Push to GitHub and keep docs consistent across repos.",
  },
];

export default function Workflow() {
  return (
    <section id="process" className="mx-auto w-full max-w-7xl px-4 pb-20">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-white">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-white/40">Workflow</p>
            <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              From profile to publish in three steps.
            </h2>
          </div>
          <button className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10">
            View docs
          </button>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-2xl border border-white/10 bg-[#0f1115] p-5">
              <div className="text-xs text-white/40">Step 0{index + 1}</div>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm text-white/60">{step.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}