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

export const runtime = "nodejs";

function createOrderId(username) {
  const safeUsername = String(username || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const suffix = crypto.randomBytes(6).toString("hex");
  return `githance-${safeUsername || "user"}-${Date.now()}-${suffix}`.slice(0, 45);
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.username) {
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
    const planConfig = getProPlanConfig(requestedCurrency);
    const orderId = createOrderId(session.username);
    const customerName =
      String(session?.user?.name || "").trim() || String(session.username || "").trim();

    const cashfreeOrder = await createCashfreeOrder({
      orderId,
      amount: planConfig.amount,
      currency: planConfig.currency,
      customerId: session.username,
      customerName,
      customerEmail: session?.user?.email || "",
      customerPhone: process.env.CASHFREE_CUSTOMER_PHONE_FALLBACK || "9999999999",
      orderNote: `GitHance Pro subscription (${planConfig.currency})`,
      source,
    });

    await upsertBillingOrder({
      orderId,
      userId: session.username,
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
        requestedCurrency: planConfig.currency,
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
