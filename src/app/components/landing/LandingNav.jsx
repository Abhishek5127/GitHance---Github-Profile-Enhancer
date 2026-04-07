"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { assets } from "@/app/assets/assets";
import LandingFeatureLink from "./LandingFeatureLink";

const links = [
  { label: "Home", href: "/" },
  { label: "Product", href: "/product" },
  { label: "Solutions", href: "/solutions" },
  { label: "Process", href: "/process" },
  { label: "Contribute", href: "/contribute" },
];

function isActiveRoute(pathname, href) {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname?.startsWith(`${href}/`);
}

function NavLink({ item, pathname, mobile = false, onNavigate }) {
  const isActive = isActiveRoute(pathname, item.href);

  if (mobile) {
    return (
      <Link
        key={item.label}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={onNavigate}
        className={`flex min-h-11 items-center rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-white/10 hover:text-white ${
          isActive ? "bg-white/10 text-white" : "text-white/80"
        }`}
      >
        {item.label}
      </Link>
    );
  }

  return (
    <Link
      key={item.label}
      href={item.href}
      aria-current={isActive ? "page" : undefined}
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
}

export default function LandingNav() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);


  useEffect(() => {
    if (!isMobileMenuOpen || typeof document === "undefined") {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const toggleMobileMenu = () => setIsMobileMenuOpen((current) => !current);

  return (
    <header className="relative z-30 w-full">
      {isMobileMenuOpen ? (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-30 bg-black/45 backdrop-blur-sm md:hidden"
        />
      ) : null}

      <nav
        aria-label="Primary"
        className="relative z-40 mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 pt-4 sm:gap-4 sm:pt-6"
      >
        <Link href="/" onClick={closeMobileMenu} className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 p-1">
            <Image src={assets.Logo} height={100} width={100} alt="GitHance logo" />
          </div>
          <div className="truncate text-lg font-bold text-white sm:text-xl">GitHance</div>
        </Link>

        <div className="relative hidden items-center gap-8 rounded-3xl border border-white/20 bg-white/10 px-6 py-4 text-sm text-white/80 shadow-lg shadow-black/20 backdrop-blur-xl before:pointer-events-none before:absolute before:inset-0 before:rounded-3xl before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-40 md:flex">
          {links.map((item) => (
            <NavLink key={item.label} item={item} pathname={pathname} />
          ))}
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <LandingFeatureLink
            href="/analyze"
            lockedElement="button"
            className="hidden min-h-11 items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 hover:text-white sm:inline-flex"
            disabledClassName="hidden min-h-11 cursor-not-allowed items-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white/35 sm:inline-flex"
          >
            Analyze repos
          </LandingFeatureLink>
          <LandingFeatureLink
            href="/profile-builder"
            lockedElement="button"
            className="flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white px-4 py-2 text-xs font-semibold text-black transition hover:bg-white/90 sm:text-sm"
            disabledClassName="flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/15 px-4 py-2 text-xs font-semibold text-white/40 sm:text-sm"
          >
            Open builder
          </LandingFeatureLink>

          <button
            type="button"
            onClick={toggleMobileMenu}
            aria-expanded={isMobileMenuOpen}
            aria-controls="landing-mobile-nav"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 text-xs font-semibold text-white/80 transition hover:bg-white/20 md:hidden"
          >
            {isMobileMenuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div
            id="landing-mobile-nav"
            className="absolute right-0 top-[calc(100%+0.75rem)] z-40 w-[min(22rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] md:hidden"
          >
            <div className="rounded-3xl border border-white/10 bg-[#0b0d0f]/95 p-4 text-white/80 shadow-[0_30px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <div className="flex flex-col gap-2">
                {links.map((item) => (
                  <NavLink
                    key={item.label}
                    item={item}
                    pathname={pathname}
                    mobile
                    onNavigate={closeMobileMenu}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-col gap-3">
                <LandingFeatureLink
                  href="/analyze"
                  lockedElement="button"
                  onClick={closeMobileMenu}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 px-4 py-3 text-sm font-semibold text-white/70 transition hover:bg-white/10"
                  disabledClassName="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-white/35"
                >
                  Analyze repos
                </LandingFeatureLink>
                <LandingFeatureLink
                  href="/profile-builder"
                  lockedElement="button"
                  onClick={closeMobileMenu}
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                  disabledClassName="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-full bg-white/15 px-4 py-3 text-sm font-semibold text-white/40"
                >
                  Open builder
                </LandingFeatureLink>
              </div>
            </div>
          </div>
        ) : null}
      </nav>
    </header>
  );
}