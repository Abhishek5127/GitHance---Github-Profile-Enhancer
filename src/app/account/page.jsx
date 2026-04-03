"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

function AccountPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status, update } = useSession();
  const callbackUrl = useMemo(
    () => String(searchParams.get("callbackUrl") || "/profile-builder"),
    [searchParams]
  );
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ tone: "info", text: "" });

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch("/api/account/github-link", { cache: "no-store" });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load account details.");
        }

        if (!cancelled) {
          setGithubUsername(String(payload.githubUsername || session?.username || ""));
        }
      } catch (error) {
        if (!cancelled) {
          setMessage({
            tone: "error",
            text: error instanceof Error ? error.message : "Failed to load account details.",
          });
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [session?.username, status]);

  const saveGithubLink = async () => {
    setLoading(true);
    setMessage({ tone: "info", text: "" });

    try {
      const response = await fetch("/api/account/github-link", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ githubUsername }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to link GitHub account.");
      }

      const normalized = String(payload.githubUsername || "");
      await update({ username: normalized, githubUsername: normalized });
      setGithubUsername(normalized);
      setMessage({ tone: "success", text: `Linked @${normalized} to your account.` });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to link GitHub account.",
      });
    } finally {
      setLoading(false);
    }
  };

  const clearGithubLink = async () => {
    setLoading(true);
    setMessage({ tone: "info", text: "" });

    try {
      const response = await fetch("/api/account/github-link", {
        method: "DELETE",
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to unlink GitHub account.");
      }

      await update({ username: "", githubUsername: "" });
      setGithubUsername("");
      setMessage({ tone: "success", text: "GitHub username unlinked from this account." });
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Failed to unlink GitHub account.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return <main className="min-h-screen bg-[#0b0d0f] p-8 text-white">Loading account...</main>;
  }

  if (status !== "authenticated") {
    return (
      <main className="min-h-screen bg-[#0b0d0f] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-[#11161d] p-8">
          <h1 className="text-3xl font-semibold">Sign in to manage your account</h1>
          <p className="mt-4 text-white/70">Your GitHub link lives on your GitHance account, not as a sign-in method.</p>
          <Link href={`/auth?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="mt-6 inline-flex rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-black">
            Open sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0d0f] px-4 py-16 text-white">
      <div className="mx-auto max-w-4xl rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
        <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffb37f]">Account</p>
        <h1 className="mt-4 text-4xl font-semibold">Link the GitHub username this account should use.</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
          README generation, profile insights, repository previews, and stats now read from the GitHub username linked to this email account.
        </p>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-white/60">Signed in as</p>
          <p className="mt-1 text-lg font-semibold text-white">{session?.user?.email || session?.userId}</p>
        </div>

        <div className="mt-6 space-y-3">
          <label className="block space-y-2">
            <span className="text-sm text-white/72">GitHub username</span>
            <input
              value={githubUsername}
              onChange={(event) => setGithubUsername(event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
              placeholder="your-github-handle"
            />
          </label>

          {message.text ? (
            <div className={`rounded-2xl border px-4 py-3 text-sm ${
              message.tone === "error"
                ? "border-red-500/30 bg-red-500/10 text-red-100"
                : message.tone === "success"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                  : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
            }`}>
              {message.text}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveGithubLink}
              disabled={loading || !githubUsername.trim()}
              className="rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : "Save GitHub link"}
            </button>
            <button
              type="button"
              onClick={clearGithubLink}
              disabled={loading || !githubUsername.trim()}
              className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              Unlink
            </button>
            <button
              type="button"
              onClick={() => router.push(callbackUrl)}
              className="rounded-full border border-white/15 bg-black/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AccountPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0d0f] p-8 text-white">Loading account...</main>}>
      <AccountPageContent />
    </Suspense>
  );
}