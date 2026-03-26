import { NextResponse } from "next/server";
import { verifyCashfreeWebhookSignature } from "@/app/lib/billing/cashfree";
import {
  activateProSubscriptionFromOrder,
  markBillingOrderState,
} from "@/app/lib/billing/subscriptions";

export const runtime = "nodejs";

function extractWebhookFields(payload) {
  return {
    type: String(payload?.type || "").trim(),
    orderId: String(payload?.data?.order?.order_id || "").trim(),
    cfOrderId: String(payload?.data?.payment_gateway_details?.gateway_order_id || "").trim(),
    userId: String(payload?.data?.customer_details?.customer_id || "").trim(),
    paymentId: String(payload?.data?.payment?.cf_payment_id || "").trim(),
    paymentStatus: String(payload?.data?.payment?.payment_status || "").trim().toUpperCase(),
    paymentTime: payload?.data?.payment?.payment_time || payload?.event_time || null,
    amount: Number(payload?.data?.order?.order_amount || 0),
    currency: String(payload?.data?.order?.order_currency || "").trim().toUpperCase(),
  };
}

export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-webhook-signature");
  const timestamp = request.headers.get("x-webhook-timestamp");
  const idempotencyKey = request.headers.get("x-idempotency-key") || "";

  try {
    const isValid = verifyCashfreeWebhookSignature({
      rawBody,
      signature,
      timestamp,
    });

    if (!isValid) {
      return NextResponse.json({ ok: false, error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const webhook = extractWebhookFields(payload);

    if (!webhook.orderId) {
      return NextResponse.json({ ok: false, error: "Missing order ID" }, { status: 400 });
    }

    await markBillingOrderState({
      orderId: webhook.orderId,
      orderStatus: webhook.paymentStatus === "SUCCESS" ? "PAID" : webhook.paymentStatus,
      paymentStatus: webhook.paymentStatus,
      cfOrderId: webhook.cfOrderId,
      paymentId: webhook.paymentId,
      paymentTime: webhook.paymentTime,
      providerPayload: payload,
      idempotencyKey,
    });

    if (webhook.paymentStatus === "SUCCESS" && webhook.userId) {
      await activateProSubscriptionFromOrder({
        orderId: webhook.orderId,
        userId: webhook.userId,
        cfOrderId: webhook.cfOrderId,
        paymentId: webhook.paymentId,
        paymentTime: webhook.paymentTime,
        amount: webhook.amount,
        currency: webhook.currency,
        providerPayload: payload,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}
