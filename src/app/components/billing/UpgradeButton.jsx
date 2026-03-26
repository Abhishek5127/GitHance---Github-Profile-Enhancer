"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useBilling } from "@/app/components/billing/BillingProvider";

let cashfreeLoaderPromise = null;

function getCurrentCallbackUrl(pathname) {
  if (typeof window !== "undefined") {
    const search = String(window.location.search || "").trim();
    const currentPath = String(window.location.pathname || pathname || "/pricing").trim();
    return `${currentPath || "/pricing"}${search}`;
  }

  return pathname || "/pricing";
}

async function loadCashfreeSdk() {
  if (typeof window === "undefined") {
    throw new Error("Cashfree checkout can only be opened in the browser");
  }

  if (typeof window.Cashfree === "function") {
    return window.Cashfree;
  }

  if (!cashfreeLoaderPromise) {
    cashfreeLoaderPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[data-githance-cashfree-sdk="true"]'
      );

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.Cashfree), {
          once: true,
        });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Cashfree checkout SDK")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.dataset.githanceCashfreeSdk = "true";
      script.onload = () => resolve(window.Cashfree);
      script.onerror = () => reject(new Error("Failed to load Cashfree checkout SDK"));
      document.head.appendChild(script);
    });
  }

  return cashfreeLoaderPromise;
}

export default function UpgradeButton({
  label = "Upgrade to Pro",
  className = "",
  source = "pricing_page",
  allowRenewal = false,
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { isPro } = useBilling();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    if (status !== "authenticated" || !session?.username) {
      await signIn("github", {
        callbackUrl: getCurrentCallbackUrl(pathname),
      });
      return;
    }

    if (isPro && !allowRenewal) {
      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await fetch("/api/billing/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: "pro",
          source,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Unable to start checkout");
      }

      const Cashfree = await loadCashfreeSdk();
      const cashfree = Cashfree({
        mode: payload?.cashfree?.mode || "sandbox",
      });

      const result = await cashfree.checkout({
        paymentSessionId: payload.paymentSessionId,
        redirectTarget: "_self",
        returnUrl: payload.returnUrl,
      });

      if (result?.error) {
        throw new Error(result.error.message || "Checkout did not open");
      }
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || (isPro && !allowRenewal);
  const buttonLabel = isPro && !allowRenewal ? "Pro Active" : isLoading ? "Opening checkout..." : label;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleUpgrade}
        disabled={isDisabled}
        className={`${className} ${isDisabled ? "cursor-not-allowed opacity-75" : ""}`}
      >
        {buttonLabel}
      </button>
      {error ? <p className="text-xs text-red-200">{error}</p> : null}
    </div>
  );
}
