"use client";

import { createContext, useContext, useMemo, useState } from "react";
import {
  normalizeProfileBuilderContextUsername,
  saveProfileBuilderContextUsername,
} from "@/app/lib/profileBuilderContext";

const LandingFeatureGateContext = createContext(null);

export function LandingFeatureGateProvider({ children }) {
  const [landingUsername, setLandingUsername] = useState("");
  const normalizedLandingUsername = normalizeProfileBuilderContextUsername(landingUsername);
  const canAccessFeature = Boolean(normalizedLandingUsername);

  const value = useMemo(() => {
    const analyzeHref = canAccessFeature
      ? {
          pathname: "/analyze",
          query: { username: normalizedLandingUsername },
        }
      : "/analyze";

    return {
      landingUsername,
      setLandingUsername,
      normalizedLandingUsername,
      canAccessFeature,
      analyzeHref,
      persistLandingUsername() {
        if (!canAccessFeature) return "";
        return saveProfileBuilderContextUsername(normalizedLandingUsername);
      },
    };
  }, [canAccessFeature, landingUsername, normalizedLandingUsername]);

  return (
    <LandingFeatureGateContext.Provider value={value}>
      {children}
    </LandingFeatureGateContext.Provider>
  );
}

export function useLandingFeatureGate() {
  const value = useContext(LandingFeatureGateContext);
  if (!value) {
    throw new Error("useLandingFeatureGate must be used within LandingFeatureGateProvider.");
  }

  return value;
}

export function useOptionalLandingFeatureGate() {
  return useContext(LandingFeatureGateContext);
}
