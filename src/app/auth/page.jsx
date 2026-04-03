"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_CALLBACK_URL = "/profile-builder";

function Notice({ tone = "info", children }) {
  const toneClass =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
        : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  if (!children) return null;

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{children}</div>;
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = useMemo(
    () => String(searchParams.get("callbackUrl") || DEFAULT_CALLBACK_URL),
    [searchParams]
  );
  const requestedMode = useMemo(() => {
    const nextMode = String(searchParams.get("mode") || "").trim().toLowerCase();
    return nextMode === "signup" ? "signup" : "login";
  }, [searchParams]);
  const requestedName = useMemo(
    () => String(searchParams.get("name") || "").trim(),
    [searchParams]
  );

  const [mode, setMode] = useState(requestedMode);
  const [stage, setStage] = useState("details");
  const [form, setForm] = useState({
    name: requestedName,
    email: "",
    password: "",
    otp: "",
  });
  const [challengeId, setChallengeId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ tone: "info", text: "" });

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [callbackUrl, router, status]);

  useEffect(() => {
    setMode(requestedMode);
    setStage("details");
    setChallengeId("");
    setMessage({ tone: "info", text: "" });
    setForm((current) => ({
      ...current,
      name: requestedName || current.name,
      otp: "",
    }));
  }, [requestedMode, requestedName]);

  const resetFlow = (nextMode) => {
    setMode(nextMode);
    setStage("details");
    setChallengeId("");
    setForm((current) => ({
      ...current,
      otp: "",
    }));
    setMessage({ tone: "info", text: "" });
  };

  const requestOtp = async () => {
    const endpoint =
      mode === "signup"
        ? "/api/auth/register/request-otp"
        : "/api/auth/login/request-otp";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        password: form.password,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.ok) {
      throw new Error(payload?.error || "Unable to send verification code.");
    }

    setChallengeId(String(payload.challengeId || ""));
    setStage("otp");
    setMessage({
      tone: "success",
      text: payload?.debugCode
        ? `Verification code sent. Dev code: ${payload.debugCode}`
        : "Verification code sent to your email.",
    });
  };

  const completeAuth = async () => {
    const result = await signIn("credentials", {
      redirect: false,
      callbackUrl,
      intent: mode,
      email: form.email,
      password: form.password,
      otp: form.otp,
      challengeId,
    });

    if (result?.error) {
      throw new Error("Invalid credentials or verification code.");
    }

    router.push(result?.url || callbackUrl);
    router.refresh();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setLoading(true);
      setMessage({ tone: "info", text: "" });

      if (stage === "details") {
        await requestOtp();
        return;
      }

      await completeAuth();
    } catch (error) {
      setMessage({
        tone: "error",
        text: error instanceof Error ? error.message : "Authentication failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0b0d0f] px-4 py-16 text-white">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-8 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#ffb37f]">
            GitHance Account
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl">
            Email sign-in with password and OTP.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/68 sm:text-base">
            Use your GitHance account for billing and workspace access, then link a GitHub username separately for README, profile, and stats features.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "Billing stays tied to your app account",
              "GitHub becomes a linked profile instead of a login method",
              "README export works without repo write-back",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/72">
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 text-sm text-white/55">
            <Link href="/" className="text-white/80 transition hover:text-white">
              Return home
            </Link>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-[#11161d] p-8 shadow-[0_30px_100px_rgba(0,0,0,0.38)]">
          <div className="flex flex-wrap gap-2 rounded-full border border-white/10 bg-black/20 p-1">
            <button
              type="button"
              onClick={() => resetFlow("login")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-black" : "text-white/68 hover:bg-white/10"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => resetFlow("signup")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "signup" ? "bg-white text-black" : "text-white/68 hover:bg-white/10"
              }`}
            >
              Create account
            </button>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="block space-y-2">
                <span className="text-sm text-white/72">Display name</span>
                <input
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  placeholder="Your name"
                />
              </label>
            ) : null}

            <label className="block space-y-2">
              <span className="text-sm text-white/72">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm text-white/72">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                placeholder="At least 8 characters"
                required
              />
            </label>

            {stage === "otp" ? (
              <label className="block space-y-2">
                <span className="text-sm text-white/72">Verification code</span>
                <input
                  inputMode="numeric"
                  value={form.otp}
                  onChange={(event) => setForm((current) => ({ ...current, otp: event.target.value }))}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none"
                  placeholder="6-digit code"
                  required
                />
              </label>
            ) : null}

            <Notice tone={message.tone}>{message.text}</Notice>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading
                  ? "Please wait..."
                  : stage === "otp"
                    ? mode === "signup"
                      ? "Create account"
                      : "Finish sign in"
                    : "Send verification code"}
              </button>

              {stage === "otp" ? (
                <button
                  type="button"
                  onClick={() => {
                    setStage("details");
                    setChallengeId("");
                    setForm((current) => ({ ...current, otp: "" }));
                    setMessage({ tone: "info", text: "" });
                  }}
                  className="rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
                >
                  Edit details
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#0b0d0f] px-4 py-16 text-white">Loading sign in...</main>}>
      <AuthPageContent />
    </Suspense>
  );
}