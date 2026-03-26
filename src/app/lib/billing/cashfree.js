import crypto from "crypto";
import {
  buildBillingReturnUrl,
  getCashfreeApiVersion,
  getCashfreeBaseUrl,
  getCashfreeMode,
} from "@/app/lib/billing/plans";

function normalizeSecret(value) {
  return String(value || "").trim();
}

export function getCashfreeConfig() {
  const clientId = normalizeSecret(
    process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_APP_ID
  );
  const clientSecret = normalizeSecret(
    process.env.CASHFREE_CLIENT_SECRET || process.env.CASHFREE_SECRET_KEY
  );
  const webhookSecret = normalizeSecret(
    process.env.CASHFREE_WEBHOOK_SECRET || clientSecret
  );

  return {
    clientId,
    clientSecret,
    webhookSecret,
    apiVersion: getCashfreeApiVersion(),
    mode: getCashfreeMode(),
    baseUrl: getCashfreeBaseUrl(),
  };
}

export function assertCashfreeConfigured() {
  const config = getCashfreeConfig();

  if (!config.clientId || !config.clientSecret) {
    throw new Error("Cashfree credentials are not configured");
  }

  return config;
}

function buildCashfreeHeaders({ requestId, idempotencyKey } = {}) {
  const config = assertCashfreeConfigured();
  const headers = {
    "Content-Type": "application/json",
    "x-api-version": config.apiVersion,
    "x-client-id": config.clientId,
    "x-client-secret": config.clientSecret,
  };

  if (requestId) {
    headers["x-request-id"] = String(requestId).trim();
  }

  if (idempotencyKey) {
    headers["x-idempotency-key"] = String(idempotencyKey).trim();
  }

  return headers;
}

async function parseCashfreeResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function createCashfreeOrder({
  orderId,
  amount,
  currency,
  customerId,
  customerName,
  customerEmail,
  customerPhone,
  orderNote,
  source,
}) {
  const config = assertCashfreeConfigured();
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    throw new Error("Order ID is required");
  }

  const requestId = crypto.randomUUID();
  const response = await fetch(`${config.baseUrl}/orders`, {
    method: "POST",
    headers: buildCashfreeHeaders({
      requestId,
      idempotencyKey: crypto.randomUUID(),
    }),
    body: JSON.stringify({
      order_id: normalizedOrderId,
      order_amount: Number(amount),
      order_currency: String(currency || "USD").trim().toUpperCase(),
      customer_details: {
        customer_id: String(customerId || "").trim(),
        customer_name: String(customerName || "").trim() || "GitHance User",
        customer_email: String(customerEmail || "").trim() || undefined,
        customer_phone:
          String(customerPhone || process.env.CASHFREE_CUSTOMER_PHONE_FALLBACK || "9999999999")
            .trim(),
      },
      order_meta: {
        return_url: buildBillingReturnUrl(normalizedOrderId),
      },
      order_note: String(orderNote || "GitHance Pro subscription").trim(),
      order_tags: {
        product: "githance_pro",
        source: String(source || "app_upgrade").trim() || "app_upgrade",
      },
    }),
    cache: "no-store",
  });

  const payload = await parseCashfreeResponse(response);
  if (!response.ok) {
    throw new Error(
      payload?.message || payload?.error || "Failed to create Cashfree order"
    );
  }

  return payload;
}

export async function fetchCashfreeOrder(orderId) {
  const config = assertCashfreeConfigured();
  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    throw new Error("Order ID is required");
  }

  const response = await fetch(`${config.baseUrl}/orders/${encodeURIComponent(normalizedOrderId)}`, {
    method: "GET",
    headers: buildCashfreeHeaders({
      requestId: crypto.randomUUID(),
    }),
    cache: "no-store",
  });

  const payload = await parseCashfreeResponse(response);
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Failed to fetch Cashfree order");
  }

  return payload;
}

function safeCompare(left, right) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyCashfreeWebhookSignature({
  rawBody,
  signature,
  timestamp,
}) {
  const config = getCashfreeConfig();
  if (!config.webhookSecret) {
    throw new Error("Cashfree webhook secret is not configured");
  }

  const payload = `${String(timestamp || "").trim()}${String(rawBody || "")}`;
  const expectedSignature = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(payload)
    .digest("base64");

  return safeCompare(expectedSignature, String(signature || "").trim());
}

export function getCashfreePublicConfig() {
  return {
    mode: getCashfreeMode(),
  };
}
