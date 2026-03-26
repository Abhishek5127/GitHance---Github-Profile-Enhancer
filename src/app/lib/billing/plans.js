import { absoluteUrl } from "@/app/lib/seo";

export const BILLING_FEATURES = {
  REPOSITORY_SECURITY: "repository_security",
  PROFILE_COMPARE: "profile_compare",
  README_AUTO_UPDATE: "readme_auto_update",
};

const DEFAULT_PRO_PRICE = 5;
const DEFAULT_PRO_CURRENCY = "USD";
const DEFAULT_PRO_DURATION_DAYS = 30;
const DEFAULT_CASHFREE_API_VERSION = "2023-08-01";

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export function getCashfreeMode() {
  return String(process.env.CASHFREE_ENVIRONMENT || "sandbox").trim().toLowerCase() ===
    "production"
    ? "production"
    : "sandbox";
}

export function getCashfreeApiVersion() {
  return String(process.env.CASHFREE_API_VERSION || DEFAULT_CASHFREE_API_VERSION).trim();
}

export function getCashfreeBaseUrl() {
  return getCashfreeMode() === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function getProPlanConfig() {
  return {
    id: "pro-monthly",
    plan: "pro",
    name: "Githance Pro",
    amount: parsePositiveNumber(process.env.GITHANCE_PRO_PRICE, DEFAULT_PRO_PRICE),
    currency: String(process.env.GITHANCE_PRO_CURRENCY || DEFAULT_PRO_CURRENCY)
      .trim()
      .toUpperCase(),
    durationDays: parsePositiveInt(
      process.env.GITHANCE_PRO_DURATION_DAYS,
      DEFAULT_PRO_DURATION_DAYS
    ),
    cadenceLabel: "/month",
  };
}

export function getFeatureLabel(featureName) {
  const labels = {
    [BILLING_FEATURES.REPOSITORY_SECURITY]: "Repository Security Analysis",
    [BILLING_FEATURES.PROFILE_COMPARE]: "Profile Compare",
    [BILLING_FEATURES.README_AUTO_UPDATE]: "README Auto-Update",
  };

  return labels[featureName] || "Githance Pro feature";
}

export function formatPriceLabel(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: String(currency || DEFAULT_PRO_CURRENCY).toUpperCase(),
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function buildBillingReturnUrl(orderId) {
  const normalizedOrderId = encodeURIComponent(String(orderId || "").trim());
  return absoluteUrl(`/billing/return?order_id=${normalizedOrderId}`);
}
