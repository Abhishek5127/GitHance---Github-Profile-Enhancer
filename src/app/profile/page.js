"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import AnalyticsShell from "@/app/components/analytics/AnalyticsShell";
import ProfileAnalyticsDashboard, {
  DASHBOARD_TABS,
} from "./profile-components/ProfileAnalyticsDashboard";

const NAV_SECTIONS = [
  {
    label: "Profile Analytics",
    items: DASHBOARD_TABS.map((tab) => ({
      id: tab.id,
      icon: tab.icon,
      label: tab.label,
    })),
  },
];

export default function Profile() {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
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

  const user = session?.username
    ? {
        name: dashboard?.profile?.name || session.username,
        subtitle: dashboard?.profile?.login ? `@${dashboard.profile.login}` : "",
      }
    : null;

  return (
    <AnalyticsShell
      context=""
      title="Githance Profile Intelligence"
      subtitle="Analyze your repositories, contribution patterns, language usage, and collaboration trends in one dashboard."
      navSections={NAV_SECTIONS}
      activeNavId={activeTab}
      onNavSelect={setActiveTab}
      user={user}
    >
      <div className="grid gap-6">
        {status === "loading" && (
          <div className="analytics-card p-6 text-sm text-white/70">Loading session...</div>
        )}

        {status !== "loading" && !session && (
          <div className="analytics-card p-6 text-sm text-white/70">
            Sign in to view your profile dashboard.
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {session && (
          <>
            {loading && (
              <div className="analytics-card p-6 text-sm text-white/70">
                Building your analytics dashboard...
              </div>
            )}

            {!loading && dashboard && (
              <div className="grid gap-6">
                {dashboard?.dataWarnings?.contributionsUnavailable && (
                  <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Contributions data is temporarily unavailable. Some metrics may be partial.
                  </div>
                )}
                <ProfileAnalyticsDashboard data={dashboard} activeTab={activeTab} />
              </div>
            )}
          </>
        )}
      </div>
    </AnalyticsShell>
  );
}
