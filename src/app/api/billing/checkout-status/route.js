import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { fetchCashfreeOrder } from "@/app/lib/billing/cashfree";
import {
  activateProSubscriptionFromOrder,
  getBillingOrderById,
  getSubscriptionForUser,
  markBillingOrderState,
} from "@/app/lib/billing/subscriptions";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.username) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const orderId = String(request.nextUrl.searchParams.get("orderId") || "").trim();
    if (!orderId) {
      return NextResponse.json({ ok: false, error: "orderId is required" }, { status: 400 });
    }

    const localOrder = await getBillingOrderById(orderId);
    if (!localOrder || String(localOrder?.userId || "").trim().toLowerCase() !== String(session.username || "").trim().toLowerCase()) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    const remoteOrder = await fetchCashfreeOrder(orderId);
    const remoteStatus = String(remoteOrder?.order_status || "").trim().toUpperCase();

    await markBillingOrderState({
      orderId,
      orderStatus: remoteStatus,
      cfOrderId: remoteOrder?.cf_order_id || "",
      providerPayload: remoteOrder,
    });

    if (remoteStatus === "PAID") {
      await activateProSubscriptionFromOrder({
        orderId,
        userId: session.username,
        cfOrderId: remoteOrder?.cf_order_id || "",
        amount: Number(remoteOrder?.order_amount || localOrder?.amount || 0),
        currency: String(
          remoteOrder?.order_currency || localOrder?.currency || "USD"
        ).trim(),
        paymentTime: remoteOrder?.created_at || new Date().toISOString(),
        providerPayload: remoteOrder,
      });
    }

    const subscription = await getSubscriptionForUser(session.username);

    return NextResponse.json({
      ok: true,
      orderStatus: remoteStatus,
      orderId,
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
