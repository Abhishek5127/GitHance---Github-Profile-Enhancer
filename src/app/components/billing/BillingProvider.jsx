"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

const BillingContext = createContext({
  loading: true,
  subscription: null,
  features: {},
  isPro: false,
  refreshBilling: async () => null,
});

const DEFAULT_FREE_SUBSCRIPTION = {
  userId: "",
  plan: "free",
  effectivePlan: "free",
  status: "expired",
  isPro: false,
  autoUpdateEnabled: false,
  autoUpdateRepo: "",
  startDate: null,
  endDate: null,
};

export function BillingProvider({ children }) {
  const { data: session, status } = useSession();
  const [state, setState] = useState({
    loading: true,
    subscription: DEFAULT_FREE_SUBSCRIPTION,
    features: {},
  });

  const refreshBilling = useCallback(async () => {
    const billingUserId = String(session?.userId || session?.user?.email || "").trim();

    if (status !== "authenticated" || !billingUserId) {
      setState({
        loading: false,
        subscription: DEFAULT_FREE_SUBSCRIPTION,
        features: {},
      });
      return null;
    }

    setState((current) => ({ ...current, loading: true }));

    try {
      const response = await fetch("/api/billing/me", {
        method: "GET",
        cache: "no-store",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to load billing state");
      }

      const subscription = payload?.subscription || DEFAULT_FREE_SUBSCRIPTION;
      const features = payload?.features || {};

      setState({
        loading: false,
        subscription,
        features,
      });

      return subscription;
    } catch {
      setState({
        loading: false,
        subscription: DEFAULT_FREE_SUBSCRIPTION,
        features: {},
      });
      return null;
    }
  }, [session?.user?.email, session?.userId, status]);

  useEffect(() => {
    if (status === "loading") {
      setState((current) => ({ ...current, loading: true }));
      return;
    }

    refreshBilling();
  }, [refreshBilling, status]);

  const value = useMemo(
    () => ({
      loading: state.loading,
      subscription: state.subscription,
      features: state.features,
      isPro: Boolean(state.subscription?.isPro),
      refreshBilling,
    }),
    [refreshBilling, state.features, state.loading, state.subscription]
  );

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

export function useBilling() {
  return useContext(BillingContext);
}
