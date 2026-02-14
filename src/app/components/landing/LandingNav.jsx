"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

const links = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Process", href: "#process" },
  { label: "Pricing", href: "#pricing" },
  { label: "Changelog", href: "#changelog" },
];

export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const handleGitHubSignIn = () => {
    signIn("github", { callbackUrl: "/profile" });
  };

  return (
    <header className="relative z-30 w-full">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm font-semibold text-white">GH</span>
          </div>
          <div className="text-lg font-semibold text-white">GitHance</div>
        </div>

        <div className="hidden items-center gap-6 text-sm text-white/70 md:flex">
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="relative pb-1 transition hover:text-white"
            >
              {item.label}
              <span className="absolute inset-x-0 -bottom-1 h-px scale-x-0 bg-white/60 transition group-hover:scale-x-100" />
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <button
            onClick={handleGitHubSignIn}
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
          >
            Sign in
          </button>
          <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
            Start free
          </button>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/20 md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "X" : "Menu"}
        </button>
      </nav>

      {open && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4 md:hidden">
          <div className="rounded-3xl border border-white/10 bg-[#0b0d0f]/90 p-4 text-white/80 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="flex flex-col gap-2">
              {links.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="rounded-xl px-4 py-2 transition hover:bg-white/10 hover:text-white"
                >
                  {item.label}
                </a>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleGitHubSignIn}
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
              >
                Sign in
              </button>
              <button className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90">
                Start free
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
