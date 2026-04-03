import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchCashfreeOrder } from "@/app/lib/billing/cashfree";
import { normalizeBillingCurrency } from "@/app/lib/billing/plans";
import {
  activateProSubscriptionFromOrder,
  getBillingOrderById,
  getSubscriptionForUser,
  markBillingOrderState,
} from "@/app/lib/billing/subscriptions";
import { resolveBillingUserId } from "@/app/lib/billing/entitlements";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    const billingUserId = resolveBillingUserId(session);
    if (!billingUserId) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const orderId = String(request.nextUrl.searchParams.get("orderId") || "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
    }

    const localOrder = await getBillingOrderById(orderId);
    if (
      !localOrder ||
      String(localOrder?.userId || "").trim().toLowerCase() !== billingUserId
    ) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const remoteOrder = await fetchCashfreeOrder(orderId);
    const remoteStatus = String(remoteOrder?.order_status || "").trim().toUpperCase();
    const orderAmount = Number(remoteOrder?.order_amount || localOrder?.amount || 0);
    const orderCurrency = normalizeBillingCurrency(
      remoteOrder?.order_currency || localOrder?.currency || "INR",
      "INR"
    );

    await markBillingOrderState({
      orderId,
      orderStatus: remoteStatus,
      cfOrderId: remoteOrder?.cf_order_id || "",
      providerPayload: remoteOrder,
    });

    if (remoteStatus === "PAID") {
      await activateProSubscriptionFromOrder({
        orderId,
        userId: billingUserId,
        cfOrderId: remoteOrder?.cf_order_id || "",
        amount: orderAmount,
        currency: orderCurrency,
        paymentTime: remoteOrder?.created_at || new Date().toISOString(),
        providerPayload: remoteOrder,
      });
    }

    const subscription = await getSubscriptionForUser(billingUserId);

    return NextResponse.json({
      ok: true,
      orderStatus: remoteStatus,
      orderId,
      orderAmount,
      orderCurrency,
      subscription,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to verify checkout status",
      },
      { status: 500 }
    );
  }
}
