"use client";
import Image from "next/image";

import { useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { assets } from "@/app/assets/assets";
import { useRouter } from "next/navigation";


const links = [
  { label: "Product", href: "#product" },
  { label: "Solutions", href: "#solutions" },
  { label: "Process", href: "#process" },
  { label: "Pricing", href: "#pricing" },
  { label: "Changelog", href: "#changelog" },
];



export default function LandingNav() {
  const [open, setOpen] = useState(false);
  const { data: session, status } = useSession();

  const handleGitHubSignIn = () => {
    signIn("github", { callbackUrl: "/profile" });
  };

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };
  const Router = useRouter();
  const isAuthenticated = status === "authenticated" && Boolean(session);

  return (
    <header className="relative z-30 w-full">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 pt-6">
        <div onClick={() => { Router.push('/') }} className="flex items-center cursor-pointer gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <span className="text-sm font-semibold text-white">
              <Image
                src={assets.Logo}
                height={100}
                width={100}
                alt="Logo" />
            </span>
          </div>
          <div className="text-xl font-bold text-white">GitHance</div>
        </div>

        <div
          className="
  hidden md:flex items-center gap-8 text-sm
  relative
  px-6 py-4
  rounded-3xl
  text-white/80

  bg-white/10
  backdrop-blur-xl
  border border-white/20
  shadow-lg shadow-black/20

  before:content-['']
  before:absolute
  before:inset-0
  before:rounded-3xl
  before:bg-gradient-to-b
  before:from-white/20
  before:to-transparent
  before:opacity-40
  before:pointer-events-none
"
        >
          {links.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="
      relative pb-1
      transition-all duration-300
      hover:text-white
      group
      "
            >
              {item.label}

              <span
                className="
        absolute inset-x-0 -bottom-1 h-px
        bg-white/70
        scale-x-0
        transition-transform duration-300
        group-hover:scale-x-100
        "
              />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex h-10 items-center justify-center rounded-full border border-white/15 bg-white px-3 py-2 text-xs text-black transition hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={handleGitHubSignIn}
              className="flex h-10 cursor-pointer items-center justify-center rounded-full border border-white/15 bg-white px-3 py-2 text-xs text-black transition hover:bg-white/10 hover:text-white sm:px-4 sm:text-sm"
            >
              <Image
                src={assets.Github}
                height={40}
                width={40}
                alt="github"
                className="hidden sm:block"
              />
              Sign in
            </button>
          )}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/20 md:hidden"
            aria-label="Toggle menu"
            onClick={() => setOpen((prev) => !prev)}
          >
            {open ? "X" : "Menu"}
          </button>
        </div>
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
