"use client";
import React from "react";
import { buildAuthRedirectHref } from "@/app/lib/authNavigation";
import { useRouter } from "next/navigation";

const Unauthorized = () => {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#090909] text-[#f4f1eb]">
      <style jsx>{`
        @keyframes fogDrift {
          0% {
            transform: translate3d(-8%, 0, 0) scale(1);
            opacity: 0.25;
          }
          50% {
            transform: translate3d(6%, -2%, 0) scale(1.06);
            opacity: 0.45;
          }
          100% {
            transform: translate3d(-8%, 0, 0) scale(1);
            opacity: 0.25;
          }
        }
        @keyframes candle {
          0%,
          100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 0.95;
            transform: scale(1.05);
          }
        }
        @keyframes reveal {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,rgba(255,236,200,0.16),transparent_35%),radial-gradient(circle_at_10%_90%,rgba(120,120,120,0.15),transparent_40%),radial-gradient(circle_at_90%_85%,rgba(80,80,80,0.12),transparent_40%)]" />
        <div
          className="absolute -left-20 top-1/4 h-[28rem] w-[32rem] rounded-full bg-[#6d6d6d]/20 blur-3xl"
          style={{ animation: "fogDrift 16s ease-in-out infinite" }}
        />
        <div
          className="absolute -right-16 bottom-10 h-[24rem] w-[30rem] rounded-full bg-[#8b7f72]/20 blur-3xl"
          style={{ animation: "fogDrift 20s ease-in-out infinite reverse" }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(transparent_96%,rgba(255,255,255,0.05)_100%)] bg-[size:100%_4px] opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_20%,#090909_80%)]" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-12">
        <div
          className="w-full rounded-2xl border border-[#7c7266]/30 bg-[#131210]/80 p-8 shadow-[0_30px_100px_rgba(0,0,0,0.7)] backdrop-blur-sm md:p-12"
          style={{ animation: "reveal 700ms ease-out both" }}
        >
          <div className="mb-7 flex items-center gap-3 text-[#d6c6ae]">
            <span
              className="inline-block h-2 w-2 rounded-full bg-[#f2c88a]"
              style={{ animation: "candle 2.1s ease-in-out infinite" }}
            />
            <span className="font-serif text-xs tracking-[0.35em]">
              <h2>AUTHORIZATION REQUIRED</h2>
            </span>
          </div>

          <h1 className="font-serif text-[clamp(4rem,11vw,8rem)] leading-[0.88] text-[#f7f3ec]">
            401
          </h1>
          <h2 className="mt-2 font-serif text-2xl text-[#e7dbc9] md:text-3xl">
            You are at a locked door
          </h2>

          <p className="mt-5 max-w-2xl text-[#bfb6a8] md:text-lg">
            This space is reserved for authenticated visitors. Step through by
            signing in with your GitHance account to continue.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <button
              onClick={() => router.push(buildAuthRedirectHref("/profile"))}
              className="rounded-md border cursor-pointer border-[#e1c59e]/70 bg-[#e1c59e] px-6 py-3 text-sm font-semibold tracking-[0.12em] text-[#1a1713] transition hover:bg-[#edd5b2]"
            >
              SIGN IN
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-md border cursor-pointer border-[#8e8476]/50 bg-transparent px-6 py-3 text-sm font-medium tracking-[0.1em] text-[#ddd4c7] transition hover:border-[#c4b8a7] hover:text-[#f7f1e8]"
            >
              RETURN HOME
            </button>
          </div>

          <div className="mt-10 border-t border-[#6f665b]/35 pt-5">
            <p className="font-serif text-sm italic text-[#aa9f90]">
              &ldquo;Permission denied until identity is proven.&rdquo;
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Unauthorized;
