"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBilling } from "@/app/components/billing/BillingProvider";
import { formatClientPriceLabel } from "@/app/lib/billing/clientCurrency";

const MAX_ATTEMPTS = 6;

function buildPaidMessage(amount, currency) {
  const numericAmount = Number(amount || 0);
  if (!numericAmount) {
    return "Your GitHance Pro subscription is active.";
  }

  return `Your GitHance Pro subscription is active at ${formatClientPriceLabel(
    numericAmount,
    currency
  )}/month.`;
}

export default function BillingReturnClient({ orderId = "" }) {
  const { refreshBilling } = useBilling();
  const [state, setState] = useState({
    loading: true,
    status: "",
    message: "Checking your payment status...",
  });

  useEffect(() => {
    const normalizedOrderId = String(orderId || "").trim();
    if (!normalizedOrderId) {
      setState({
        loading: false,
        status: "missing",
        message: "No billing order was attached to this return request.",
      });
      return;
    }

    let isCancelled = false;

    const pollOrder = async () => {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        try {
          const response = await fetch(
            `/api/billing/checkout-status?orderId=${encodeURIComponent(normalizedOrderId)}`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const payload = await response.json().catch(() => null);
          if (!response.ok || !payload?.ok) {
            throw new Error(payload?.error || "Unable to verify this payment right now.");
          }

          if (isCancelled) return;

          if (payload.orderStatus === "PAID") {
            await refreshBilling();
            setState({
              loading: false,
              status: "paid",
              message: buildPaidMessage(payload?.orderAmount, payload?.orderCurrency),
            });
            return;
          }

          if (payload.orderStatus === "EXPIRED" || payload.orderStatus === "FAILED") {
            setState({
              loading: false,
              status: "failed",
              message: "This payment was not completed.",
            });
            return;
          }

          if (attempt < MAX_ATTEMPTS - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2500));
            continue;
          }

          setState({
            loading: false,
            status: "pending",
            message:
              "We are still waiting for Cashfree to confirm the payment. Refresh this page in a few seconds.",
          });
          return;
        } catch (error) {
          if (isCancelled) return;

          setState({
            loading: false,
            status: "error",
            message:
              error instanceof Error
                ? error.message
                : "Unable to verify this payment right now.",
          });
          return;
        }
      }
    };

    pollOrder();

    return () => {
      isCancelled = true;
    };
  }, [orderId, refreshBilling]);

  return (
    <div className="min-h-screen bg-[#0b0d0f] px-4 py-20 text-white">
      <div className="mx-auto max-w-2xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffb37f]">
          Billing Status
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
          {state.status === "paid"
            ? "GitHance Pro is ready."
            : state.status === "failed"
              ? "Payment not completed."
              : "Checking your order."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/70">{state.message}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/profile-builder"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff7a1a] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
          >
            Open profile builder
          </Link>
          <Link
            href="/pricing#pro"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}
