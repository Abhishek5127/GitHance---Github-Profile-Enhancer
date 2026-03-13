"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const THEME_KEY = "analytics-theme";

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-3 rounded-full border border-[color:var(--analytics-border)] bg-[color:var(--analytics-surface-soft)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition"
      aria-pressed={isDark}
    >
      <span className="analytics-faint">Day</span>
      <span
        className={`relative h-5 w-10 rounded-full transition ${isDark ? "bg-[color:var(--analytics-accent)]" : "bg-[color:var(--analytics-border)]"
          }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-[color:var(--analytics-surface)] shadow transition ${isDark ? "translate-x-5" : "translate-x-1"
            }`}
        />
      </span>
      <span className="analytics-faint">Night</span>
    </button>
  );
}

function NavItem({ item, isActive, onSelect }) {
  const baseClasses =
    "analytics-nav-item flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";
  const activeClasses = "bg-[color:var(--analytics-sidebar-active-bg)] text-[color:var(--analytics-sidebar-active-text)]";
  const inactiveClasses = "hover:bg-white/10";
  const classes = `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`;

  const iconSource = item.icon || item.svg;

  const content = (
    <>
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-semibold uppercase tracking-[0.18em] ${isActive ? "text-[color:var(--analytics-sidebar-active-text)]" : "text-inherit"
          }`}
      >
        {iconSource ? (
          <Image
            src={iconSource}
            alt={item.label}
            width={18}
            height={18}
            className="object-contain"
          />
        ) : (
          <span className="h-4 w-4" aria-hidden="true" />
        )}
      </span>
      <span className="flex-1 text-left cursor-pointer">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.16em]">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <a href={item.href} className={classes}>
        {content}
      </a>
    );
  }

  return (
    <button type="button" className={classes} onClick={() => onSelect?.(item.id)}>
      {content}
    </button>
  );
}

export default function AnalyticsShell({
  brand = "Githance",
  context = "Analytics",
  title,
  subtitle,
  navSections = [],
  activeNavId,
  onNavSelect,
  children,
  user,
  searchPlaceholder = "Search analytics...",
}) {
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      return;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return (
    <div className="analytics-shell min-h-screen" data-theme={theme} style={{ colorScheme: theme }}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="analytics-sidebar text- flex w-full flex-col gap-6 px-5 py-6 lg:min-h-screen lg:w-72">
          <div>
            <p className="font-serif text-2xl text-[color:var(--analytics-sidebar-text)]">{brand}</p>
            
          </div>

          <nav className="flex flex-1 flex-col gap-6">
            {navSections.map((section) => (
              <div key={section.label}>

                <p className="text-[11px] uppercase tracking-[0.3em] text-[color:var(--analytics-sidebar-muted)]">
                  {section.label}
                </p>
                <div className="mt-3 space-y-1">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={item.id === activeNavId}
                      onSelect={onNavSelect}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {user ? (
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--analytics-sidebar-muted)]">Analyst</p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--analytics-sidebar-text)]">
                {user.name}
              </p>
              {user.subtitle ? (
                <p className="mt-1 text-xs text-[color:var(--analytics-sidebar-muted)]">{user.subtitle}</p>
              ) : null}
            </div>
          ) : null}
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="analytics-card mx-4 mt-4 flex flex-col gap-4 px-6 py-4 lg:mx-6 lg:mt-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--analytics-faint)]">{context}</p>
              <h1 className="mt-2 text-2xl font-serif text-[color:var(--analytics-text)] sm:text-3xl">
                {title}
              </h1>
              {subtitle ? <p className="mt-2 font-normal max-w-2xl text-sm text-[color:var(--analytics-muted)]">{subtitle}</p> : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  className="analytics-input h-10 w-56 rounded-full px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--analytics-ring,rgba(47,125,50,0.35))]"
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </div>
              <ThemeToggle theme={theme} onToggle={toggleTheme} />
            </div>
          </header>

          <main className="flex-1 px-4 pb-12 pt-6 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
