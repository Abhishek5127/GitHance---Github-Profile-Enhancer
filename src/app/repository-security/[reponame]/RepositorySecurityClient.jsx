"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AnalyticsShell from "@/app/components/analytics/AnalyticsShell";
import SecurityOverview from "@/app/readme-analyze/readme-analyze-components/SecurityOverview";
import Link from "next/link";

async function fetchSecurityData({ username, reponame }) {
  const res = await fetch("/api/repo-security", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, reponame }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to run security analysis");
  }
  return data;
}

function buildNavSections(reponame, owner) {
  const encodedRepo = encodeURIComponent(reponame || "");
  const ownerQuery = owner ? `?owner=${encodeURIComponent(owner)}` : "";

  return [
    {
      label: "Repository Security",
      items: [
        { id: "overview", label: "Overview", href: "#overview" },
        { id: "coverage", label: "Coverage", href: "#coverage" },
        { id: "severity", label: "Severity", href: "#severity" },
        { id: "hotspots", label: "Hotspots", href: "#hotspots" },
        { id: "findings", label: "Findings", href: "#findings" },
        {
          id: "readme-lab",
          label: "README Lab",
          href: `/readme-analyze/${encodedRepo}${ownerQuery}`,
        },
      ],
    },
  ];
}

export default function RepositorySecurityClient({ reponame }) {
  const searchParams = useSearchParams();
  const owner = useMemo(
    () => String(searchParams.get("owner") || "").trim().toLowerCase(),
    [searchParams]
  );
  const [loading, setLoading] = useState(false);
  const [securityError, setSecurityError] = useState(null);
  const [securityReport, setSecurityReport] = useState(null);
  const [securityMeta, setSecurityMeta] = useState(null);

  useEffect(() => {
    if (!owner || !reponame) return;

    let isCancelled = false;

    const runAnalysis = async () => {
      setLoading(true);
      setSecurityError(null);

      try {
        const securityResult = await fetchSecurityData({ username: owner, reponame });
        if (isCancelled) return;

        setSecurityReport(securityResult?.report || null);
        setSecurityMeta(securityResult?.analysisMeta || null);
      } catch (error) {
        if (isCancelled) return;
        setSecurityReport(null);
        setSecurityMeta(null);
        setSecurityError(error?.message || "Security analysis failed for this repository.");
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    runAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [owner, reponame]);

  const user = owner ? { name: owner, subtitle: reponame ? `Repo: ${reponame}` : "" } : null;

  if (!owner) {
    return (
      <AnalyticsShell
        context="Repository"
        title={reponame || "Repository security"}
        subtitle="Open this repository from the analyzer so GitHance knows which GitHub owner to inspect."
        navSections={buildNavSections(reponame, owner)}
        activeNavId="overview"
        user={user}
      >
        <section className="analytics-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Repository Owner Required</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Open this security view from the repository analyzer.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            GitHance needs the repository owner to fetch source files and run the security analysis. Start from the analyzer so the correct owner is attached to the route.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
            >
              Open repository analyzer
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-black/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Return home
            </Link>
          </div>
        </section>
      </AnalyticsShell>
    );
  }

  return (
    <AnalyticsShell
      context="Repository"
      title={reponame || "Repository security"}
      subtitle="Vulnerability patterns, severity breakdowns, risk hotspots, and actionable fixes for this repository."
      navSections={buildNavSections(reponame, owner)}
      activeNavId="overview"
      user={user}
    >
      <div className="grid gap-6">
        <SecurityOverview
          loading={loading}
          error={securityError}
          report={securityReport}
          meta={securityMeta}
          showHeader={false}
        />
      </div>
    </AnalyticsShell>
  );
}
