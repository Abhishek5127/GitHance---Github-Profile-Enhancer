"use client";
import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const UserDataBlock = ({ userData, loading }) => {
  const router = useRouter();

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="h-24 w-full rounded-2xl bg-white/5" />
        <div className="mt-6 grid gap-3">
          <div className="h-6 w-1/2 rounded bg-white/10" />
          <div className="h-4 w-2/3 rounded bg-white/10" />
          <div className="h-4 w-1/3 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No profile data available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="h-20 w-full bg-gradient-to-r from-orange-500/30 via-amber-400/20 to-cyan-400/20" />

      <div className="flex flex-col gap-6 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="-mt-10 w-fit rounded-2xl border border-white/10 bg-[#0b0d0f] p-2">
            <Image
              src={userData.avatar_url}
              alt="Profile"
              width={96}
              height={96}
              className="rounded-xl object-cover"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold text-white">
                {userData.name || userData.login}
              </h2>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                GitHub
              </span>
            </div>

            <p className="mt-2 max-w-xl text-sm text-white/60">
              {userData.bio || "Add a short bio to describe your work and interests."}
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-full bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]">
                Follow
              </button>
              <button
                onClick={() => router.push("/profile-builder")}
                className="rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
              >
                Edit Profile README
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Followers</p>
            <p className="mt-2 text-xl font-semibold text-white">{userData.followers}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Following</p>
            <p className="mt-2 text-xl font-semibold text-white">{userData.following}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Repos</p>
            <p className="mt-2 text-xl font-semibold text-white">{userData.public_repos}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDataBlock;