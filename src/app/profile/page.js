"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import UserDataBlock from "./profile-components/UserDataBlock";
import UserReposBlock from "./profile-components/userReposBlock";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [userRepos, setUserRepos] = useState([]);
  const [loadingUser, setLoadingUser] = useState(false);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState(null);
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    const getUserData = async () => {
      const username = session?.username;
      if (!username) return;

      try {
        setLoadingUser(true);
        setError(null);
        const res = await fetch("/api/github", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });

        if (!res.ok) throw new Error("Failed to fetch user data");
        const data = await res.json();
        setUserData(data.profile);
      } catch (err) {
        setError("Unable to load profile data.");
      } finally {
        setLoadingUser(false);
      }
    };

    getUserData();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const getRepoData = async () => {
      const username = session?.username;
      if (!username) return;

      try {
        setLoadingRepos(true);
        setError(null);
        const res = await fetch("/api/repositories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, token: session?.accessToken }),
        });

        if (!res.ok) throw new Error("Failed to fetch repositories");
        const data = await res.json();
        setUserRepos(data.repos || []);
      } catch (err) {
        setError("Unable to load repositories.");
      } finally {
        setLoadingRepos(false);
      }
    };

    getRepoData();
  }, [status, session?.accessToken, session?.username]);

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute -left-40 top-10 h-80 w-80 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.25),_transparent_60%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.2),_transparent_60%)] blur-3xl" />

        <div className="mx-auto w-full max-w-6xl px-4 pt-12">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Profile</p>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
              Your GitHub dashboard
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/60">
              Keep your profile, repos, and README workflow aligned with GitHance.
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-20 pt-10">
        {status === "loading" && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Loading session...
          </div>
        )}

        {status !== "loading" && !session && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            Sign in to view your profile dashboard.
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {session && (
          <div className="mt-6 grid gap-6">
            <UserDataBlock userData={userData} loading={loadingUser} />
            <UserReposBlock userRepos={userRepos} loading={loadingRepos} />
          </div>
        )}
      </div>
    </div>
  );
}
