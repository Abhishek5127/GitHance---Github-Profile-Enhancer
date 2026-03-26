"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LandingNav from "../components/landing/LandingNav";
import Footer from "../components/landing/Footer";
import ProBadge from "@/app/components/billing/ProBadge";
import UpgradeButton from "@/app/components/billing/UpgradeButton";
import { useBilling } from "@/app/components/billing/BillingProvider";
import {
  normalizeClientBillingCurrency,
  resolveClientBillingCurrency,
  setSavedBillingCurrency,
} from "@/app/lib/billing/clientCurrency";

function formatEndDate(value) {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolvePlanPricing(plan, currency) {
  const normalizedCurrency = normalizeClientBillingCurrency(currency);

  if (!plan?.pricing || typeof plan.pricing !== "object") {
    return {
      amount: Number(plan?.price || 0),
      currency: normalizedCurrency,
      priceLabel: plan?.priceLabel || "$0",
      cadence: plan?.cadence || "/month",
    };
  }

  return (
    plan.pricing[normalizedCurrency] ||
    plan.pricing.INR ||
    Object.values(plan.pricing)[0] || {
      amount: 0,
      currency: normalizedCurrency,
      priceLabel: "$0",
      cadence: "/month",
    }
  );
}

export default function PricingClient({ plans, faqs, defaultCurrency = "INR" }) {
  const { isPro, loading, subscription } = useBilling();
  const [selectedCurrency, setSelectedCurrency] = useState(
    normalizeClientBillingCurrency(defaultCurrency, "INR")
  );
  const proEndsOn = formatEndDate(subscription?.endDate);

  useEffect(() => {
    setSelectedCurrency(resolveClientBillingCurrency(defaultCurrency));
  }, [defaultCurrency]);

  const handleCurrencyChange = (nextCurrency) => {
    const normalizedCurrency = setSavedBillingCurrency(nextCurrency);
    setSelectedCurrency(normalizedCurrency);
  };

  const proPlan = plans.find((plan) => String(plan?.name || "").toLowerCase() === "pro");
  const currencyOptions = proPlan?.pricing ? Object.values(proPlan.pricing) : [];

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-24 top-8 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.2),_transparent_70%)] blur-3xl" />
        <LandingNav />
      </div>

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 pb-24 pt-12 sm:px-6 sm:pt-16">
        <section className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">Pricing</p>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
            Choose the plan that matches your GitHub visibility and documentation goals.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
            Scale from individual profile polishing to team-wide documentation quality without changing tools.
          </p>
          {currencyOptions.length ? (
            <div className="mt-8 flex flex-col items-center gap-3">
              <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
                {currencyOptions.map((option) => {
                  const isActive = option.currency === selectedCurrency;

                  return (
                    <button
                      key={option.currency}
                      type="button"
                      onClick={() => handleCurrencyChange(option.currency)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-[#ff7a1a] text-black shadow-[0_10px_30px_rgba(255,122,26,0.35)]"
                          : "text-white/70 hover:text-white"
                      }`}
                      aria-pressed={isActive}
                    >
                      {option.currency} {option.priceLabel}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs leading-6 text-white/55">
                India-based browsers default to INR so Cashfree checkout opens in the safer local currency.
              </p>
            </div>
          ) : null}
          {isPro && !loading ? (
            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-3 rounded-full border border-[#ff7a1a]/25 bg-[#ff7a1a]/10 px-4 py-2 text-sm text-[#ffd6b7]">
              <ProBadge />
              <span>{proEndsOn ? `Active until ${proEndsOn}` : "Your Pro subscription is active."}</span>
            </div>
          ) : null}
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => {
            const isPlanPro = plan.name.toLowerCase() === "pro";
            const activePricing = isPlanPro
              ? resolvePlanPricing(plan, selectedCurrency)
              : {
                  amount: Number(plan.price || 0),
                  currency: "USD",
                  priceLabel: plan.priceLabel,
                  cadence: plan.cadence,
                };

            return (
              <article
                id={plan.name.toLowerCase()}
                key={plan.name}
                className={`rounded-[30px] border p-6 shadow-[0_26px_90px_rgba(0,0,0,0.3)] sm:p-7 ${plan.accent}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-semibold text-white">{plan.name}</h2>
                  <div className="flex items-center gap-2">
                    {isPlanPro && isPro ? <ProBadge /> : null}
                    {plan.featured ? (
                      <span className="rounded-full border border-[#ff7a1a]/35 bg-[#ff7a1a]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb37f]">
                        Most Popular
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <div className="text-4xl font-semibold text-white sm:text-5xl">
                    {activePricing.priceLabel}
                  </div>
                  <div className="pb-1 text-sm text-white/60">{activePricing.cadence}</div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/65">{plan.summary}</p>

                <ul className="mt-5 space-y-2 text-sm text-white/72">
                  {plan.features.map((feature) => (
                    <li key={feature} className="rounded-xl border border-white/10 bg-[#0b0d0f]/70 px-3 py-2">
                      {feature}
                    </li>
                  ))}
                </ul>

                {isPlanPro ? (
                  <div className="mt-6 space-y-2">
                    <UpgradeButton
                      source="pricing_page"
                      currency={activePricing.currency}
                      label={isPro ? "Pro Active" : `Upgrade for ${activePricing.priceLabel}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                    />
                    {!isPro ? (
                      <p className="text-center text-xs text-white/50">
                        Checkout will open in {activePricing.currency} for {activePricing.priceLabel}
                        {activePricing.cadence}.
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    href="/profile-builder"
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    {plan.cta}
                  </Link>
                )}
              </article>
            );
          })}
        </section>

        <section className="mt-12 rounded-[30px] border border-white/10 bg-[#111418] p-6 sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-3xl font-semibold text-white">FAQ</h2>
            <Link
              href="/profile-builder"
              className="inline-flex items-center justify-center rounded-full border border-white/20 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10"
            >
              Start Free Workspace
            </Link>
          </div>
          <div className="mt-6 grid gap-4">
            {faqs.map((item) => (
              <article key={item.question} className="rounded-2xl border border-white/10 bg-[#0b0d0f]/75 p-4">
                <h3 className="text-base font-semibold text-white">{item.question}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
