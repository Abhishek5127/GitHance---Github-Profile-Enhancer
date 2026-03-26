"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { assets } from "@/app/assets/assets";
import { usePathname } from "next/navigation";

const links = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Solutions", href: "/solutions" },
  { label: "Process", href: "/process" },
  { label: "Pricing", href: "/pricing" },
  { label: "Changelog", href: "/changelog" },
];

export default function LandingNav({ signInCallbackUrl = "/profile" }) {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isAuthenticated = status === "authenticated" && Boolean(session);

  const isActiveRoute = (href) => pathname === href || pathname?.startsWith(`${href}/`);

  const handleGitHubSignIn = () => {
    signIn("github", { callbackUrl: signInCallbackUrl });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <header className="relative z-30 w-full">
      <nav
        aria-label="Primary"
        className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pt-4 sm:gap-4 sm:pt-6"
      >
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1">
            <Image src={assets.Logo} height={100} width={100} alt="GitHance logo" />
          </div>
          <div className="text-lg font-bold text-white sm:text-xl">GitHance</div>
        </Link>

        <div className="relative hidden items-center gap-8 rounded-3xl border border-white/20 bg-white/10 px-6 py-4 text-sm text-white/80 shadow-lg shadow-black/20 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-40 md:flex">
          {links.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`group relative pb-1 transition-all duration-300 ${
                  isActive ? "text-white" : "text-white/80 hover:text-white"
                }`}
              >
                {item.label}
                <span
                  className={`absolute inset-x-0 -bottom-1 h-px bg-white/70 transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  }`}
                />
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex h-10 items-center justify-center rounded-full border border-white/15 bg-white px-3 py-2 text-xs font-bold text-black transition hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              className="flex h-10 items-center justify-center rounded-full border border-white/15 bg-white px-3 py-2 text-xs text-black transition hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
            >
              <Image src={assets.Github} height={40} width={40} alt="GitHub icon" className="hidden sm:block" />
              Sign in
            </button>
          )}
          <button
            className="flex h-10 min-w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition hover:bg-white/20 md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>

      {open && (
        <div className="mx-auto mt-4 w-full max-w-7xl px-4 md:hidden">
          <div className="rounded-3xl border border-white/10 bg-[#0b0d0f]/90 p-4 text-white/80 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur">
            <div className="flex flex-col gap-2">
              {links.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`rounded-xl px-4 py-2 transition hover:bg-white/10 hover:text-white ${
                    isActiveRoute(item.href) ? "bg-white/10 text-white" : ""
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={handleGitHubSignIn}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
                >
                  Sign in
                </button>
              )}
              <Link
                href="/profile-builder"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Start free
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

