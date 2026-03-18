"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { assets } from "@/app/assets/assets";
import { useRouter } from "next/navigation";

const THEME_KEY = "analytics-theme";
const SIDEBAR_COLLAPSE_KEY = "analytics-sidebar-collapsed";

function ThemeToggle({ theme, onToggle, collapsed }) {
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-10 w-10 items-center justify-center ${collapsed?"lg-hidden":""} rounded-full border border-[color:var(--analytics-border)] bg-[color:var(--analytics-surface-soft)] text-[11px] font-semibold uppercase tracking-[0.2em] transition hover:scale-[1.02]`}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      aria-pressed={isDark}
      title={isDark ? "Light theme" : "Dark theme"}
    >
      <Image
        src={isDark ? assets.Sun : assets.Moon}
        height={22}
        width={22}
        alt="theme toggle"
        className="object-contain transition-transform duration-500 hover:rotate-180"
      />
    </button>
  );
}

function SidebarControlButton({ label, onClick, children, className = "", hiddenOn = "" }) {
  return (
    

    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-[color:var(--analytics-sidebar-text)] transition hover:bg-white/15 ${hiddenOn} ${className}`}
      >
      {children}
    </button>
      
  );
}

function MenuIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M4 12h16" strokeLinecap="round" />
      <path d="M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6L6 18" strokeLinecap="round" />
    </svg>
  );
}

function CollapseIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M9 5v14" strokeLinecap="round" />
      <path d="M14 9l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <path d="M15 5v14" strokeLinecap="round" />
      <path d="M10 9l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OverviewIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function InsightsIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 3l1.9 4.6L19 9.5l-4 3.4 1.2 5.1L12 15.4 7.8 18l1.2-5.1-4-3.4 5.1-1.9L12 3z" strokeLinejoin="round" />
    </svg>
  );
}

function BuilderIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M7 12h10" strokeLinecap="round" />
      <path d="M10 17h4" strokeLinecap="round" />
      <circle cx="8" cy="7" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

function EditorIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" strokeLinejoin="round" />
      <path d="M12.5 7.5l4 4" strokeLinecap="round" />
    </svg>
  );
}

function PreviewIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function SecurityIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.3-2.5 7.8-7 10-4.5-2.2-7-5.7-7-10V6l7-3z" strokeLinejoin="round" />
      <path d="M9.5 12l1.7 1.7 3.3-3.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoverageIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="4" y="6" width="16" height="4" rx="1.5" />
      <rect x="4" y="14" width="16" height="4" rx="1.5" />
    </svg>
  );
}

function SeverityIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M12 4l8 14H4L12 4z" strokeLinejoin="round" />
      <path d="M12 9v4" strokeLinecap="round" />
      <circle cx="12" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

function HotspotsIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M13.5 3c.6 2.5-.5 4.3-2.3 5.8C9 10.8 8 12 8 14.2A4 4 0 0012 18a4.5 4.5 0 004.5-4.5c0-1.7-.7-3.2-2.1-4.7-.7 1.4-1.8 2.2-3 2.6 1.4-2 .7-5.4 2.1-8.4z" strokeLinejoin="round" />
    </svg>
  );
}

function FindingsIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M8 7h11" strokeLinecap="round" />
      <path d="M8 12h11" strokeLinecap="round" />
      <path d="M8 17h11" strokeLinecap="round" />
      <circle cx="5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="5" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ReadmeIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <path d="M7 4.5h7l4 4V19a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19V6A1.5 1.5 0 017.5 4.5z" strokeLinejoin="round" />
      <path d="M14 4.5V9h4" strokeLinejoin="round" />
      <path d="M9 12h6" strokeLinecap="round" />
      <path d="M9 15.5h6" strokeLinecap="round" />
    </svg>
  );
}

function DefaultNavIcon({ className = "h-[18px] w-[18px]" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function FallbackNavIcon({ item, isActive }) {
  const normalizedId = String(item?.id || "").trim().toLowerCase();
  const normalizedLabel = String(item?.label || "").trim().toLowerCase();
  const iconClassName = `h-[18px] w-[18px] ${isActive ? "opacity-100" : "opacity-90"}`;

  const iconMap = {
    overview: OverviewIcon,
    insights: InsightsIcon,
    builder: BuilderIcon,
    editor: EditorIcon,
    preview: PreviewIcon,
    security: SecurityIcon,
    "security-view": SecurityIcon,
    "repository-security": SecurityIcon,
    coverage: CoverageIcon,
    severity: SeverityIcon,
    hotspots: HotspotsIcon,
    findings: FindingsIcon,
    "readme-lab": ReadmeIcon,
  };

  let IconComponent = iconMap[normalizedId] || null;

  if (!IconComponent) {
    if (normalizedLabel.includes("security")) {
      IconComponent = SecurityIcon;
    } else if (normalizedLabel.includes("readme")) {
      IconComponent = ReadmeIcon;
    } else if (normalizedLabel.includes("preview")) {
      IconComponent = PreviewIcon;
    } else if (normalizedLabel.includes("build") || normalizedLabel.includes("builder")) {
      IconComponent = BuilderIcon;
    } else if (normalizedLabel.includes("edit")) {
      IconComponent = EditorIcon;
    } else if (normalizedLabel.includes("insight")) {
      IconComponent = InsightsIcon;
    } else if (normalizedLabel.includes("find")) {
      IconComponent = FindingsIcon;
    } else {
      IconComponent = DefaultNavIcon;
    }
  }

  return <IconComponent className={iconClassName} />;
}

function NavItem({ item, isActive, onSelect, onActivate, collapsed = false }) {
  const baseClasses =
    "analytics-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition";

  const activeClasses =
    "bg-[color:var(--analytics-sidebar-active-bg)] text-[color:var(--analytics-sidebar-active-text)]";

  const inactiveClasses = "hover:bg-white/10";
  const collapsedClasses = collapsed ? "lg:justify-center lg:px-2" : "";

  const classes = `${baseClasses} ${collapsedClasses} ${
    isActive ? activeClasses : inactiveClasses
  }`;

  const iconSource = item.icon || item.svg;

  const content = (
    <>
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/10 text-xs font-semibold uppercase tracking-[0.18em] ${
          isActive
            ? "text-[color:var(--analytics-sidebar-active-text)]"
            : "text-inherit"
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
          <FallbackNavIcon item={item} isActive={isActive} />
        )}
      </span>

      <span className={`min-w-0 flex-1 text-left ${collapsed ? "lg:hidden" : ""}`}>
        {item.label}
      </span>

      {item.badge ? (
        <span
          className={`rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] tracking-[0.16em] ${
            collapsed ? "lg:hidden" : ""
          }`}
        >
          {item.badge}
        </span>
      ) : null}
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className={classes}
        onClick={onActivate}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={() => {
        onSelect?.(item.id);
        onActivate?.();
      }}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
    >
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
}) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";

    const storedTheme = window.localStorage.getItem(THEME_KEY);
    if (storedTheme === "dark" || storedTheme === "light") {
      return storedTheme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches
      ? "dark"
      : "light";
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === "true";
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleViewportChange = (event) => {
      if (event.matches) {
        setIsMobileSidebarOpen(false);
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
      return () => mediaQuery.removeEventListener("change", handleViewportChange);
    }

    mediaQuery.addListener(handleViewportChange);
    return () => mediaQuery.removeListener(handleViewportChange);
  }, []);

  const toggleTheme = () =>
    setTheme((current) => (current === "dark" ? "light" : "dark"));

  const handleSidebarToggle = () =>
    setIsSidebarCollapsed((current) => !current);

  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);
  const openMobileSidebar = () => setIsMobileSidebarOpen(true);

  return (
    <div
      className="analytics-shell min-h-screen"
      data-theme={theme}
      style={{ colorScheme: theme }}
    >
      <div className="flex min-h-screen">
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeMobileSidebar}
          className={`fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-sm transition lg:hidden ${
            isMobileSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          }`}
        />

        <aside
          className={`analytics-sidebar fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col gap-6 overflow-y-auto border-r border-white/10 px-5 py-6 shadow-2xl transition-all duration-300 ease-out lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:translate-x-0 lg:shadow-none ${
            isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } ${isSidebarCollapsed ? "w-72 lg:w-24 lg:px-3" : "w-72 lg:w-72"}`}
        >
          <div className={`flex items-center ${isSidebarCollapsed?"justify-center item-center":"justify-between"}`}>
            <button
              type="button"
              onClick={() => router.push("/")}
              className={`font-serif text-2xl text-[color:var(--analytics-sidebar-text)] transition ${
                isSidebarCollapsed ? "lg:text-center" : ""
              }`}
              title={brand}
            >
              <span className={isSidebarCollapsed ? "lg:hidden" : ""}>{brand}</span>
              
            </button>

            <div className={`flex items-center gap-2 ${isSidebarCollapsed ? "lg:flex-col content-center" : ""}`}>
              <div className={isSidebarCollapsed ? "lg:hidden" : ""}>
                <ThemeToggle theme={theme} onToggle={toggleTheme} />
              </div>
              <SidebarControlButton
                label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={handleSidebarToggle}
                hiddenOn="hidden lg:inline-flex"
              >
                {isSidebarCollapsed ? <ExpandIcon /> : <CollapseIcon />}
              </SidebarControlButton>
              <SidebarControlButton
                label="Close navigation"
                onClick={closeMobileSidebar}
                hiddenOn="lg:hidden"
              >
                <CloseIcon />
              </SidebarControlButton>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-6">
            {navSections.map((section) => (
              <div key={section.label}>
                <p
                  className={`text-[11px] uppercase tracking-[0.3em] text-[color:var(--analytics-sidebar-muted)] ${
                    isSidebarCollapsed ? "lg:hidden" : ""
                  }`}
                >
                  {section.label}
                </p>

                <div className={`${isSidebarCollapsed ? "mt-0 lg:mt-0" : "mt-3"} space-y-1`}>
                  {section.items.map((item) => (
                    <NavItem
                      key={item.id}
                      item={item}
                      isActive={item.id === activeNavId}
                      onSelect={onNavSelect}
                      onActivate={closeMobileSidebar}
                      collapsed={isSidebarCollapsed}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="analytics-card mx-4 mt-4 flex flex-col gap-4 px-5 py-4 sm:px-6 lg:mx-6 lg:mt-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <SidebarControlButton
                label="Open navigation"
                onClick={openMobileSidebar}
                hiddenOn="lg:hidden"
                className="h-11 w-11 shrink-0 border-[color:var(--analytics-border)] bg-[color:var(--analytics-surface-soft)] text-[color:var(--analytics-text)]"
              >
                <MenuIcon />
              </SidebarControlButton>

              <div>
                {context ? (
                  <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--analytics-faint)]">
                    {context}
                  </p>
                ) : null}

                <h1 className="mt-2 text-2xl font-serif text-[color:var(--analytics-text)] sm:text-3xl">
                  {title}
                </h1>

                {subtitle ? (
                  <p className="mt-2 max-w-2xl text-sm font-normal text-[color:var(--analytics-muted)]">
                    {subtitle}
                  </p>
                ) : null}
              </div>
            </div>

            {user ? (
              <div className="self-start rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left lg:self-auto lg:text-right">
                <p className="text-sm font-semibold text-[color:var(--analytics-text)]">{user.name}</p>
                {user.subtitle ? (
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[color:var(--analytics-faint)]">
                    {user.subtitle}
                  </p>
                ) : null}
              </div>
            ) : null}
          </header>

          <main className="flex-1 min-w-0 px-4 pb-12 pt-6 lg:px-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

