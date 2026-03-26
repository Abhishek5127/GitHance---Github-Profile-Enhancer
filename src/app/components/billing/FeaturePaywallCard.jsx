"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import LockIcon from "./LockIcon";
import UpgradeButton from "./UpgradeButton";

export default function FeaturePaywallCard({
  title,
  description,
  source = "feature_gate",
}) {
  const { status } = useSession();

  return (
    <section className="rounded-[28px] border border-[#ff7a1a]/25 bg-[linear-gradient(180deg,rgba(255,122,26,0.12),rgba(12,15,18,0.96))] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-3 text-[#ffd6b7]">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#ff7a1a]/30 bg-[#ff7a1a]/12">
          <LockIcon className="h-5 w-5" />
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.24em]">Githance Pro</span>
      </div>

      <h2 className="mt-4 text-2xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">{description}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {status === "authenticated" ? (
          <UpgradeButton
            source={source}
            label="Upgrade to Pro"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff7a1a] px-5 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
          />
        ) : (
          <button
            type="button"
            onClick={() => signIn("github", { callbackUrl: "/pricing" })}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Sign in to upgrade
          </button>
        )}

        <Link
          href="/pricing#pro"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
        >
          View pricing
        </Link>
      </div>
    </section>
  );
}
