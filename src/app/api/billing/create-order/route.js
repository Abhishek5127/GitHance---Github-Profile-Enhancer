import crypto from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createCashfreeOrder, getCashfreePublicConfig } from "@/app/lib/billing/cashfree";
import {
  detectBillingCurrencyFromLocale,
  getProPlanConfig,
  normalizeBillingCurrency,
} from "@/app/lib/billing/plans";
import { upsertBillingOrder } from "@/app/lib/billing/subscriptions";
import { resolveBillingUserId } from "@/app/lib/billing/entitlements";

export const runtime = "nodejs";

function createOrderId(userId) {
  const safeUserId = String(userId || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = crypto.randomBytes(6).toString("hex");
  return `githance-${safeUserId || "user"}-${Date.now()}-${suffix}`.slice(0, 45);
}

function isUnsupportedMerchantCurrencyError(error) {
  const message = String(error instanceof Error ? error.message : error || "")
    .trim()
    .toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("currency not enabled for this merchant account") ||
    message.includes("order currency not enabled for this merchant account")
  );
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    const billingUserId = resolveBillingUserId(session);
    if (!billingUserId) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const source = String(body?.source || "pricing_page").trim();
    const plan = String(body?.plan || "pro").trim().toLowerCase();

    if (plan !== "pro") {
      return NextResponse.json({ ok: false, error: "Unsupported billing plan" }, { status: 400 });
    }

    const localeHeader = String(request.headers.get("accept-language") || "").trim();
    const fallbackCurrency = detectBillingCurrencyFromLocale(localeHeader, "INR");
    const requestedCurrency = normalizeBillingCurrency(body?.currency, fallbackCurrency);
    const requestedPlanConfig = getProPlanConfig(requestedCurrency);
    let planConfig = requestedPlanConfig;

    const orderId = createOrderId(billingUserId);
    const customerName =
      String(session?.user?.name || "").trim() ||
      String(session?.username || "").trim() ||
      billingUserId;

    const createOrderForPlan = (config) =>
      createCashfreeOrder({
        orderId,
        amount: config.amount,
        currency: config.currency,
        customerId: billingUserId,
        customerName,
        customerEmail: session?.user?.email || billingUserId,
        customerPhone: process.env.CASHFREE_CUSTOMER_PHONE_FALLBACK || "9999999999",
        orderNote: `GitHance Pro subscription (${config.currency})`,
        source,
      });

    let cashfreeOrder;
    let currencyFallback = null;

    try {
      cashfreeOrder = await createOrderForPlan(planConfig);
    } catch (createOrderError) {
      if (
        requestedPlanConfig.currency !== "INR" &&
        isUnsupportedMerchantCurrencyError(createOrderError)
      ) {
        planConfig = getProPlanConfig("INR");
        cashfreeOrder = await createOrderForPlan(planConfig);
        currencyFallback = {
          requested: requestedPlanConfig.currency,
          used: planConfig.currency,
        };
      } else {
        throw createOrderError;
      }
    }

    await upsertBillingOrder({
      orderId,
      userId: billingUserId,
      plan: "pro",
      amount: planConfig.amount,
      currency: planConfig.currency,
      cfOrderId: cashfreeOrder?.cf_order_id || "",
      paymentSessionId: cashfreeOrder?.payment_session_id || "",
      orderStatus: cashfreeOrder?.order_status || "ACTIVE",
      returnUrl: cashfreeOrder?.order_meta?.return_url || "",
      source,
      metadata: {
        createdVia: source,
        locale: localeHeader,
        requestedCurrency: requestedPlanConfig.currency,
        chargedCurrency: planConfig.currency,
      },
    });

    return NextResponse.json({
      ok: true,
      orderId,
      paymentSessionId: String(cashfreeOrder?.payment_session_id || ""),
      returnUrl: String(cashfreeOrder?.order_meta?.return_url || ""),
      cashfree: getCashfreePublicConfig(),
      plan: {
        id: planConfig.id,
        amount: planConfig.amount,
        currency: planConfig.currency,
        durationDays: planConfig.durationDays,
      },
      currencyFallback,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to create payment order",
      },
      { status: 500 }
    );
  }
}
