"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReadmeBlock from "../readme-analyze-components/ReadmeBlock";
import SecurityOverview from "../readme-analyze-components/SecurityOverview";
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import Unauthorized from "@/app/statusCodePages/unauthorized";

async function fetchRepoTreeData({ username, reponame, token }) {
  const res = await fetch("/api/repoTree", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, reponame, token }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to fetch repository tree");
  }
  return data;
}

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
  const [repoTree, setRepoTree] = useState([]);
  const [relevantFilesFromSecurity, setRelevantFilesFromSecurity] = useState([]);
  const [loading, setLoading] = useState(false);
  const [treeError, setTreeError] = useState(null);
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
      setTreeError(null);
      setSecurityError(null);

      const username = session.username;
      const token = session.accessToken;

      const [treeResult, securityResult] = await Promise.allSettled([
        fetchRepoTreeData({ username, reponame, token }),
        fetchSecurityData({ username, reponame, token }),
      ]);

      if (isCancelled) return;

      if (treeResult.status === "fulfilled") {
        setRepoTree(Array.isArray(treeResult.value?.tree) ? treeResult.value.tree : []);
      } else {
        setRepoTree([]);
        setTreeError(treeResult.reason?.message || "Unable to load repository files.");
      }

      if (securityResult.status === "fulfilled") {
        setSecurityReport(securityResult.value?.report || null);
        setSecurityMeta(securityResult.value?.analysisMeta || null);
        setRelevantFilesFromSecurity(
          Array.isArray(securityResult.value?.relevantFiles)
            ? securityResult.value.relevantFiles
            : []
        );
      } else {
        setSecurityReport(null);
        setSecurityMeta(null);
        setRelevantFilesFromSecurity([]);
        setSecurityError(
          securityResult.reason?.message || "Security analysis failed for this repository."
        );
      }

      setLoading(false);
      setSecurityLoading(false);
    };

    runAnalysis();

    return () => {
      isCancelled = true;
    };
  }, [status, session?.username, session?.accessToken, reponame]);

  const relevantFiles =
    relevantFilesFromSecurity.length > 0
      ? relevantFilesFromSecurity
      : getRelevantFiles(repoTree, { maxFiles: 120 });

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] p-6 text-sm text-white/70">
        Loading repository analysis...
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

        {treeError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {treeError}
          </div>
        ) : null}

        <ReadmeBlock tree={relevantFiles} />
      </div>
    </div>
  );
}
