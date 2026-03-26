const SUPPORTED_BILLING_CURRENCIES = ["INR", "USD"];
const DEFAULT_BILLING_CURRENCY = "INR";
const BILLING_CURRENCY_STORAGE_KEY = "githance.billing.currency";

export function normalizeClientBillingCurrency(value, fallback = DEFAULT_BILLING_CURRENCY) {
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
    : DEFAULT_BILLING_CURRENCY;
}

function localeLooksIndian(locale) {
  const normalized = String(locale || "")
    .trim()
    .toUpperCase();

  return normalized === "IN" || normalized.includes("-IN") || normalized.includes("_IN");
}

function getBrowserLocales() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return [];
  }

  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  return [...languages, navigator.language].filter(Boolean);
}

export function detectClientBillingCurrency(fallback = DEFAULT_BILLING_CURRENCY) {
  const browserLocales = getBrowserLocales();

  if (browserLocales.some((locale) => localeLooksIndian(locale))) {
    return "INR";
  }

  return normalizeClientBillingCurrency(fallback);
}

export function getSavedBillingCurrency() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return normalizeClientBillingCurrency(
      window.localStorage.getItem(BILLING_CURRENCY_STORAGE_KEY),
      ""
    );
  } catch {
    return "";
  }
}

export function resolveClientBillingCurrency(fallback = DEFAULT_BILLING_CURRENCY) {
  const savedCurrency = getSavedBillingCurrency();
  if (savedCurrency) {
    return savedCurrency;
  }

  return detectClientBillingCurrency(fallback);
}

export function setSavedBillingCurrency(currency) {
  const normalizedCurrency = normalizeClientBillingCurrency(currency);

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(BILLING_CURRENCY_STORAGE_KEY, normalizedCurrency);
    } catch {
      return normalizedCurrency;
    }
  }

  return normalizedCurrency;
}

export function formatClientPriceLabel(amount, currency) {
  const normalizedCurrency = normalizeClientBillingCurrency(currency);

  return new Intl.NumberFormat(normalizedCurrency === "USD" ? "en-US" : "en-IN", {
    style: "currency",
    currency: normalizedCurrency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function getBillingCurrencySymbol(currency) {
  return normalizeClientBillingCurrency(currency) === "USD" ? "$" : "\u20b9";
}
