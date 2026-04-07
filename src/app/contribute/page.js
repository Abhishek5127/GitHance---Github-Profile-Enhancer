import Footer from "../components/landing/Footer";
import LandingNav from "../components/landing/LandingNav";
import Image from "next/image";
import { buyMeACoffeeLink, hasBuyMeACoffeeLink } from "../lib/support";

const socialLinks = [
  { href: "https://github.com/abhishek5127", icon: "GH", label: "GitHub" },
  { href: "https://linkedin.com/in/abhishek-choudhary5127", icon: "IN", label: "LinkedIn" },
  {
    href: "https://github.com/Abhishek5127/GitHance---Github-Profile-Enhancer",
    icon: "OSS",
    label: "Contribute to Repository",
  },
];

export default function ContributePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <LandingNav pathname="/contribute" />

      <main
        style={{ fontFamily: "'Geist Mono', monospace" }}
        className="relative mx-auto max-w-4xl overflow-hidden px-6 py-14 sm:px-10"
      >
        <div
          className="pointer-events-none absolute -right-40 -top-28 h-[480px] w-[480px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(184,153,90,0.07) 0%, transparent 65%)" }}
        />

        <div
          className="mb-5 inline-flex items-center gap-2.5 text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "#b8995a" }}
        >
          <span className="block h-px w-7" style={{ background: "#b8995a" }} />
          Developer Info
        </div>

        <h1
          className="mb-12 font-normal leading-[1.08]"
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(2.6rem, 5.5vw, 4.2rem)",
            fontStyle: "italic",
          }}
        >
          The person
          <br />
          behind the <span style={{ color: "#b8995a", fontStyle: "normal" }}>tool.</span>
        </h1>

        <div className="relative overflow-hidden rounded-sm border border-white/[0.07] transition-colors hover:border-white/[0.15]">
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-px"
            style={{
              background: "linear-gradient(90deg, transparent, #b8995a 40%, #b8995a 60%, transparent)",
              opacity: 0.45,
            }}
          />

          <div className="grid md:grid-cols-[220px_1fr]">
            <div className="flex flex-col items-center gap-[18px] border-b border-white/[0.07] bg-white/[0.02] px-8 py-11 md:border-b-0 md:border-r">
              <div className="relative h-28 w-28">
                <div
                  className="absolute inset-[-2px] animate-spin rounded-full"
                  style={{
                    background: "conic-gradient(#b8995a 0deg, transparent 180deg, #b8995a 360deg)",
                    animationDuration: "9s",
                    opacity: 0.55,
                  }}
                />
                <div className="absolute inset-[-1px] rounded-full bg-[#0f0f0f]" />
                <Image
                  src="https://avatars.githubusercontent.com/u/206503696?v=4"
                  height={112}
                  width={112}
                  alt="Abhishek"
                  className="relative z-10 rounded-full object-cover"
                />
              </div>

              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
                <span className="h-[5px] w-[5px] animate-pulse rounded-full bg-green-400 shadow-[0_0_5px_rgba(74,222,128,0.65)]" />
                Available
              </div>
            </div>

            <div className="flex flex-col gap-7 px-6 py-10 sm:px-12 sm:py-11">
              <div>
                <h2
                  className="mb-1.5 font-normal leading-none"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(2rem, 3.5vw, 2.8rem)" }}
                >
                  Abhishek
                </h2>
                <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: "#b8995a" }}>
                  Full-Stack Developer
                </p>
                <div className="mt-4 h-px w-9 bg-white/15" />
              </div>

              <p className="max-w-[500px] text-white/50" style={{ fontSize: "12.5px", fontWeight: 300, lineHeight: 1.9 }}>
                Githance is built by Abhishek, a developer who got tired of doing repetitive GitHub tasks manually.
                Instead of overthinking it, he built a tool that makes things easier: analyzing repos, generating
                READMEs, and improving profiles without the usual hassle. Simple idea. Save time, reduce effort,
                present work better.
              </p>

              <section
                id="support"
                className="relative overflow-hidden rounded-sm border border-[rgba(184,153,90,0.22)] bg-[rgba(184,153,90,0.06)] px-5 py-5"
              >
                <div
                  className="pointer-events-none absolute inset-y-0 left-0 w-px"
                  style={{ background: "linear-gradient(180deg, transparent, rgba(184,153,90,0.7), transparent)" }}
                />
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Support GitHance</p>
                <h3
                  className="mt-3 text-white"
                  style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(1.4rem, 3vw, 1.85rem)" }}
                >
                  Buy me a coffee if GitHance saved you time.
                </h3>
                <p className="mt-3 max-w-[520px] text-white/55" style={{ fontSize: "12.5px", lineHeight: 1.9 }}>
                  GitHance stays public and improves faster when users support ongoing work on the builder, README
                  generation, and repository analysis experience.
                </p>

                {hasBuyMeACoffeeLink ? (
                  <a
                    href={buyMeACoffeeLink}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative mt-5 inline-flex items-center gap-2 overflow-hidden border border-[rgba(184,153,90,0.35)] px-[22px] py-[10px] text-[10px] uppercase tracking-[0.14em] text-[#f3d3a1] transition-colors hover:border-[rgba(184,153,90,0.55)] hover:text-white"
                    style={{ borderRadius: "2px" }}
                  >
                    <span className="absolute inset-0 -translate-x-full bg-[rgba(184,153,90,0.18)] transition-transform duration-300 group-hover:translate-x-0" />
                    <span className="relative text-[11px] font-semibold">BMC</span>
                    <span className="relative">Buy me a coffee</span>
                  </a>
                ) : (
                  <p className="mt-5 max-w-[520px] text-[11px] leading-6 text-white/45">
                    Add <code className="rounded bg-black/40 px-1.5 py-1 text-[10px] text-white/70">NEXT_PUBLIC_BUY_ME_A_COFFEE_URL</code> to activate the live support button here.
                  </p>
                )}
              </section>

              <div className="flex flex-wrap gap-2.5">
                {socialLinks.map(({ href, icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative inline-flex items-center gap-2 overflow-hidden border border-white/15 px-[22px] py-[9px] text-[10px] uppercase tracking-[0.14em] text-white/50 transition-colors hover:border-[rgba(184,153,90,0.35)] hover:text-[#b8995a]"
                    style={{ borderRadius: "2px" }}
                  >
                    <span className="absolute inset-0 -translate-x-full bg-[rgba(184,153,90,0.12)] transition-transform duration-300 group-hover:translate-x-0" />
                    <span className="relative text-[11px] font-semibold">{icon}</span>
                    <span className="relative">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/[0.07] bg-white/[0.02] px-6 py-3 text-[9px] uppercase tracking-[0.14em] text-white/20 sm:px-12 md:flex-row md:items-center md:justify-between">
            <span>Githance - v1.0 - 2026</span>
            <span className="flex items-center gap-1.5 tracking-[0.12em]">
              <span className="h-1 w-1 rounded-full opacity-60" style={{ background: "#b8995a" }} />
              Built with obsession, shipped with care
            </span>
            <span>Jaipur, India</span>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
