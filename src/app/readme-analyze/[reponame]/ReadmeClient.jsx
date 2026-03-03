"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
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

  if (status === "loading" || loading || securityLoading) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] text-white">
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

        <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
          <header className="rounded-3xl border border-white/10 bg-[linear-gradient(140deg,rgba(20,20,28,0.95),rgba(14,26,36,0.88))] p-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/45">Repository Analysis</p>
            <h1 className="mt-2 text-3xl font-semibold">{reponame}</h1>
            <p className="mt-2 max-w-3xl text-sm text-white/65">
              Parsing repository, mapping code surfaces, and running vulnerability analytics.
            </p>
          </header>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <ReadmeBlock loading />

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Security Pipeline</p>
              <div className="mt-4 space-y-3">
                {[
                  "Identifying developer-owned source files",
                  "Excluding dependencies and generated artifacts",
                  "Running rule-based vulnerability analysis",
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
      </div>
    );
  }
  if (status !== "authenticated") {
    return <Unauthorized />;
  }

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="mx-auto w-full max-w-7xl space-y-6 p-6">
        <header className="rounded-3xl border border-white/10 bg-[linear-gradient(140deg,rgba(20,20,28,0.95),rgba(14,26,36,0.88))] p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Repository Analysis</p>
          <h1 className="mt-2 text-3xl font-semibold">{reponame}</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/65">
            Vulnerability patterns, severity breakdowns, risk hotspots, and actionable fixes for this repository.
          </p>
        </header>

        <SecurityOverview
          loading={securityLoading}
          error={securityError}
          report={securityReport}
          meta={securityMeta}
        />
      </div>
    </div>
  );
}
