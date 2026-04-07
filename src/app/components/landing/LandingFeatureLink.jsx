"use client";

import Link from "next/link";
import { useOptionalLandingFeatureGate } from "./LandingFeatureGate";

const GATED_FEATURE_ROUTES = new Set([
  "/analyze",
  "/profile-builder",
  "/readme-preview",
]);

function isGatedFeatureRoute(href) {
  return GATED_FEATURE_ROUTES.has(String(href || "").trim());
}

export default function LandingFeatureLink({
  href,
  className = "",
  disabledClassName = "",
  lockedElement = "span",
  onClick,
  children,
  ...props
}) {
  const featureGate = useOptionalLandingFeatureGate();
  const shouldGate = Boolean(featureGate) && isGatedFeatureRoute(href);
  const resolvedHref = shouldGate && href === "/analyze" ? featureGate.analyzeHref : href;

  if (shouldGate && !featureGate.canAccessFeature) {
    const Tag = lockedElement === "button" ? "button" : "span";
    const lockedProps =
      Tag === "button"
        ? {
            type: "button",
            disabled: true,
          }
        : {};

    return (
      <Tag
        aria-disabled="true"
        className={`${className} ${disabledClassName}`.trim()}
        {...lockedProps}
      >
        {children}
      </Tag>
    );
  }

  const handleClick = (event) => {
    if (shouldGate) {
      featureGate.persistLandingUsername();
    }

    onClick?.(event);
  };

  return (
    <Link href={resolvedHref} className={className} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}
