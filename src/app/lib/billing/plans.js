import { absoluteUrl } from "@/app/lib/seo";

export const BILLING_FEATURES = {
  REPOSITORY_SECURITY: "repository_security",
  PROFILE_COMPARE: "profile_compare",
  README_AUTO_UPDATE: "readme_auto_update",
};

export const SUPPORTED_BILLING_CURRENCIES = ["INR", "USD"];

const DEFAULT_PRO_PRICING = {
  INR: {
    amount: 499,
    locale: "en-IN",
  },
  USD: {
    amount: 5,
    locale: "en-US",
  },
};

const DEFAULT_PRO_CURRENCY = "INR";
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

function resolveLegacyConfiguredAmount(currency) {
  const normalizedCurrency = normalizeBillingCurrency(currency);
  const configuredLegacyCurrency = normalizeBillingCurrency(
    process.env.GITHANCE_PRO_CURRENCY,
    ""
  );

  if (configuredLegacyCurrency && configuredLegacyCurrency === normalizedCurrency) {
    return parsePositiveNumber(
      process.env.GITHANCE_PRO_PRICE,
      DEFAULT_PRO_PRICING[normalizedCurrency].amount
    );
  }

  return DEFAULT_PRO_PRICING[normalizedCurrency].amount;
}

function resolveConfiguredAmount(currency) {
  const normalizedCurrency = normalizeBillingCurrency(currency);
  const envKey =
    normalizedCurrency === "USD" ? "GITHANCE_PRO_PRICE_USD" : "GITHANCE_PRO_PRICE_INR";
  const configuredValue = process.env[envKey];

  if (configuredValue) {
    return parsePositiveNumber(configuredValue, DEFAULT_PRO_PRICING[normalizedCurrency].amount);
  }

  return resolveLegacyConfiguredAmount(normalizedCurrency);
}

function resolveLocaleForCurrency(currency) {
  return normalizeBillingCurrency(currency) === "USD" ? "en-US" : "en-IN";
}

export function normalizeBillingCurrency(value, fallback = DEFAULT_PRO_CURRENCY) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();

  if (SUPPORTED_BILLING_CURRENCIES.includes(normalized)) {
    return normalized;
  }

  const normalizedFallback = String(fallback || "")
    .trim()
    .toUpperCase();

  if (!normalizedFallback) {
    return "";
  }

  return SUPPORTED_BILLING_CURRENCIES.includes(normalizedFallback)
    ? normalizedFallback
    : DEFAULT_PRO_CURRENCY;
}

export function isIndiaLocale(locale) {
  const normalized = String(locale || "")
    .trim()
    .toUpperCase();

  if (!normalized) {
    return false;
  }

  return normalized === "IN" || normalized.includes("-IN") || normalized.includes("_IN");
}

export function detectBillingCurrencyFromLocale(locale, fallback = DEFAULT_PRO_CURRENCY) {
  if (isIndiaLocale(locale)) {
    return "INR";
  }

  return normalizeBillingCurrency(fallback);
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

export function getProPlanConfig(currency = DEFAULT_PRO_CURRENCY) {
  const normalizedCurrency = normalizeBillingCurrency(currency);

  return {
    id: "pro-monthly",
    plan: "pro",
    name: "Githance Pro",
    amount: resolveConfiguredAmount(normalizedCurrency),
    currency: normalizedCurrency,
    durationDays: parsePositiveInt(
      process.env.GITHANCE_PRO_DURATION_DAYS,
      DEFAULT_PRO_DURATION_DAYS
    ),
    cadenceLabel: "/month",
    locale: DEFAULT_PRO_PRICING[normalizedCurrency].locale,
  };
}

export function getSupportedProPlans() {
  return SUPPORTED_BILLING_CURRENCIES.map((currency) => getProPlanConfig(currency));
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
  const normalizedCurrency = normalizeBillingCurrency(currency);

  return new Intl.NumberFormat(resolveLocaleForCurrency(normalizedCurrency), {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function buildBillingReturnUrl(orderId) {
  const normalizedOrderId = encodeURIComponent(String(orderId || "").trim());
  return absoluteUrl(`/billing/return?order_id=${normalizedOrderId}`);
}

export function buildBillingWebhookUrl() {
  return absoluteUrl("/api/billing/webhook");
}

