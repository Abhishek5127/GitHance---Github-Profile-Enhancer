"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ProfileAnalyticsDashboard from "./profile-components/ProfileAnalyticsDashboard";

export default function Profile() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;
    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/github/dashboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session?.username || "" }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load profile analytics");
        }

        if (cancelled) return;
        setDashboard(payload);
      } catch (fetchError) {
        if (cancelled) return;
        setError(fetchError?.message || "Unable to load profile analytics.");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [session?.username, status]);

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.25),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.2),_transparent_60%)] blur-3xl" />

        <div className="mx-auto w-full max-w-6xl px-4 pt-12">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Profile</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              GitHub profile intelligence
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Analyze your repositories, contribution patterns, language usage, and collaboration trends in one dashboard.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
        {status === "loading" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Loading session...
          </div>
        )}

        {status !== "loading" && !session && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Sign in to view your profile dashboard.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {session && (
          <>
            {loading && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
                Building your analytics dashboard...
              </div>
            )}

            {!loading && dashboard && (
              <div className="mt-6 grid gap-6">
                {dashboard?.dataWarnings?.contributionsUnavailable && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Contributions data is temporarily unavailable. Some metrics may be partial.
                  </div>
                )}
                <ProfileAnalyticsDashboard data={dashboard} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
