"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AnalyticsShell from "@/app/components/analytics/AnalyticsShell";
import ReadmeBlock from "../readme-analyze-components/ReadmeBlock";
import SecurityOverview from "../readme-analyze-components/SecurityOverview";
import Unauthorized from "@/app/statusCodePages/unauthorized";

async function fetchSecurityData({ username, reponame, token }) {
  const res = await fetch("/api/repo-security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, reponame, token }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to run security analysis");
  }
  return data;
}

const NAV_SECTIONS = [
  {
    label: "Repository",
    items: [
      { id: "overview", label: "Overview", href: "#overview" },
      { id: "coverage", label: "Coverage", href: "#coverage" },
      { id: "severity", label: "Severity", href: "#severity" },
      { id: "hotspots", label: "Hotspots", href: "#hotspots" },
      { id: "findings", label: "Findings", href: "#findings" },
    ],
  },
];

export default function ReadmeClient({ reponame }) {
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  const [securityReport, setSecurityReport] = useState(null);
  const [securityMeta, setSecurityMeta] = useState(null);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !session?.username ||
      !session?.accessToken ||
      !reponame
    ) {
      return;
    }

    let isCancelled = false;

    const runAnalysis = async () => {
      setLoading(true);
      setSecurityLoading(true);
      setSecurityError(null);

      const username = session.username;
      const token = session.accessToken;

      try {
        const securityResult = await fetchSecurityData({ username, reponame, token });
        if (isCancelled) return;

        setSecurityReport(securityResult?.report || null);
        setSecurityMeta(securityResult?.analysisMeta || null);
      } catch (error) {
        if (isCancelled) return;

        setSecurityReport(null);
        setSecurityMeta(null);
        setSecurityError(
          error?.message || "Security analysis failed for this repository."
        );
      } finally {
        if (isCancelled) return;
        setLoading(false);
        setSecurityLoading(false);
      }
    };

    runAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [status, session?.username, session?.accessToken, reponame]);

  const user = session?.username
    ? { name: session.username, subtitle: reponame ? `Repo: ${reponame}` : "" }
    : null;

  if (status === "loading" || loading || securityLoading) {
    return (
      <AnalyticsShell
        context="Repository"
        title={reponame || "Repository analysis"}
        subtitle="Parsing repository, mapping code surfaces, and running vulnerability analytics."
        navSections={NAV_SECTIONS}
        activeNavId="overview"
        user={user}
      >
        <style jsx>{`
          @keyframes pulseLine {
            0% {
              opacity: 0.38;
              transform: scaleX(0.82);
            }
            50% {
              opacity: 0.95;
              transform: scaleX(1);
            }
            100% {
              opacity: 0.38;
              transform: scaleX(0.82);
            }
          }
          @keyframes orbit {
            0% {
              transform: translateX(0);
            }
            50% {
              transform: translateX(8px);
            }
            100% {
              transform: translateX(0);
            }
          }
        `}</style>

        <div className="grid gap-6">
          <section
            id="overview"
            className="analytics-card p-6 bg-[linear-gradient(135deg,var(--analytics-surface)_0%,var(--analytics-surface-soft)_55%,var(--analytics-accent-soft)_100%)]"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--analytics-faint)]">
              Repository Analysis
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-white">{reponame}</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Parsing repository, mapping code surfaces, and running vulnerability analytics.
            </p>
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ReadmeBlock loading />

            <section className="analytics-card p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Security Pipeline</p>
              <div className="mt-4 space-y-3">
                {[
                  "Identifying developer-owned source files",
                  "Excluding dependencies and generated artifacts",
                  "Running AST-based semantic vulnerability analysis",
                  "Grouping issues and computing security score",
                ].map((step, index) => (
                  <div key={step} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full bg-cyan-300"
                        style={{ animation: `orbit 900ms ease-in-out ${index * 120}ms infinite` }}
                      />
                      <span className="text-sm text-white/80">{step}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ animation: `pulseLine 1300ms ease-in-out ${index * 180}ms infinite` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </AnalyticsShell>
    );
  }

  if (status !== "authenticated") {
    return <Unauthorized />;
  }

  return (
    <AnalyticsShell
      context="Repository"
      title={reponame || "Repository analysis"}
      subtitle="Vulnerability patterns, severity breakdowns, risk hotspots, and actionable fixes for this repository."
      navSections={NAV_SECTIONS}
      activeNavId="overview"
      user={user}
    >
      <div className="grid gap-6">
        <section
          id="overview"
          className="analytics-card p-6 bg-[linear-gradient(135deg,var(--analytics-surface)_0%,var(--analytics-surface-soft)_55%,var(--analytics-accent-soft)_100%)]"
        >
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--analytics-faint)]">
            Repository Analysis
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{reponame}</h2>
          <p className="mt-2 max-w-3xl text-sm text-white/70">
            Vulnerability patterns, severity breakdowns, risk hotspots, and actionable fixes for this repository.
          </p>
        </section>

        <SecurityOverview
          loading={securityLoading}
          error={securityError}
          report={securityReport}
          meta={securityMeta}
          showHeader={false}
        />
      </div>
    </AnalyticsShell>
  );
}
