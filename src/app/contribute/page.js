import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import Image from "next/image";

export default function ContributePage() {
  return (
    <div className="bg-black text-white min-h-screen">
      <LandingNav />

      <main
        style={{ fontFamily: "'Geist Mono', monospace" }}
        className="relative max-w-4xl mx-auto px-10 py-14 overflow-hidden"
      >
        {/* Glow blob */}
        <div className="pointer-events-none absolute -top-28 -right-40 w-[480px] h-[480px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(184,153,90,0.07) 0%, transparent 65%)" }} />

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2.5 text-[10px] tracking-[0.22em] uppercase mb-5"
          style={{ color: "#b8995a" }}>
          <span className="block w-7 h-px" style={{ background: "#b8995a" }} />
          Developer Info
        </div>

        {/* Heading */}
        <h1 className="mb-12 font-normal leading-[1.08]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)", fontStyle: "italic" }}>
          The person<br />
          behind the{" "}
          <span style={{ color: "#b8995a", fontStyle: "normal" }}>tool.</span>
        </h1>

        {/* Card */}
        <div className="relative border border-white/[0.07] rounded-sm overflow-hidden transition-colors hover:border-white/[0.15]">
          {/* Top gold line */}
          <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, transparent, #b8995a 40%, #b8995a 60%, transparent)", opacity: 0.45 }} />

          <div className="grid" style={{ gridTemplateColumns: "220px 1fr" }}>

            {/* Left — photo column */}
            <div className="flex flex-col items-center gap-[18px] px-8 py-11 border-r border-white/[0.07] bg-white/[0.02]">
              {/* Avatar with spinning ring */}
              <div className="relative w-28 h-28">
                <div className="absolute inset-[-2px] rounded-full animate-spin"
                  style={{
                    background: "conic-gradient(#b8995a 0deg, transparent 180deg, #b8995a 360deg)",
                    animationDuration: "9s", opacity: 0.55,
                  }} />
                <div className="absolute inset-[-1px] rounded-full bg-[#0f0f0f]" />
                <Image
                  src="https://avatars.githubusercontent.com/u/206503696?v=4"
                  height={112} width={112}
                  alt="Abhishek"
                  className="relative z-10 rounded-full object-cover"
                />
              </div>

              {/* Status */}
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.14em] uppercase text-white/40">
                <span className="w-[5px] h-[5px] rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.65)] animate-pulse" />
                Available
              </div>
            </div>

            {/* Right — content */}
            <div className="flex flex-col gap-7 px-12 py-11">
              <div>
                <h2 className="font-normal leading-none mb-1.5"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 3.5vw, 2.8rem)" }}>
                  Abhishek
                </h2>
                <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "#b8995a" }}>
                  Full-Stack Developer
                </p>
                <div className="w-9 h-px bg-white/15 mt-4" />
              </div>

              <p className="text-white/50 font-light leading-[1.9] max-w-[500px]" style={{ fontSize: "12.5px" }}>
                Githance is built by Abhishek — a developer who got tired of doing
                repetitive GitHub tasks manually. Instead of overthinking it, he built
                a tool that just makes things easier: analyzing repos, generating
                READMEs, and improving profiles without the usual hassle.
                Simple idea. Save time, reduce effort, present work better.
              </p>

              <div className="flex gap-2.5 flex-wrap">
                {[
                  { href: "https://github.com/abhishek5127", icon: "⌥", label: "GitHub" },
                  { href: "https://linkedin.com/in/abhishek-choudhary5127", icon: "◈", label: "LinkedIn" },
                ].map(({ href, icon, label }) => (
                  <a key={label} href={href} target="_blank"
                    className="group relative inline-flex items-center gap-2 px-[22px] py-[9px] text-[10px] tracking-[0.14em] uppercase border border-white/15 text-white/50 overflow-hidden transition-colors hover:text-[#b8995a] hover:border-[rgba(184,153,90,0.35)]"
                    style={{ borderRadius: "2px" }}>
                    <span className="absolute inset-0 bg-[rgba(184,153,90,0.12)] -translate-x-full group-hover:translate-x-0 transition-transform duration-300" />
                    <span className="relative text-[13px]">{icon}</span>
                    <span className="relative">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Meta bar */}
          <div className="flex items-center justify-between px-12 py-3 border-t border-white/[0.07] bg-white/[0.02]">
            <span className="text-[9px] tracking-[0.14em] uppercase text-white/20">Githance · v1.0 · 2026</span>
            <span className="flex items-center gap-1.5 text-[9px] tracking-[0.12em] uppercase text-white/20">
              <span className="w-1 h-1 rounded-full opacity-60" style={{ background: "#b8995a" }} />
              Built with obsession, shipped with care
            </span>
            <span className="text-[9px] tracking-[0.14em] uppercase text-white/20">Jaipur, India</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}