"use client";
import React, { useState } from "react";

const Page = () => {
  const [username, setUsername] = useState("");
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [repoCount, setRepoCount] = useState(10)

  /* ------------------ UPDATE README ------------------ */
  const editReadme = async () => {
    const res = await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        repo: username,
        path: "README.md",
        message: "Updated via Analyzer App",
        content: "# Updated README! 🚀\nThis was modified automatically.",
      }),
    });

    const data = await res.json();
    console.log("Update result:", data);
  };

  /* ------------------ FETCH PROFILE ------------------ */
  const analyzeProfile = async () => {
    if (!username.trim()) return;

    setProfile(null);
    setLoading(true);

    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    setLoading(false);
    setProfile(data);
  };

  /* ------------------ FETCH REPOS + README ------------------ */
  const getRepos = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setRepos([]);

    const res = await fetch("/api/readmeRepo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username,repoCount }),
    });

    const data = await res.json();
    setLoading(false);

    if (data.success) setRepos(data.repos);
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold">GitHub Analyzer</h2>

        <input
          className="border p-2 rounded"
          placeholder="Enter GitHub username..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            className="bg-black text-white px-4 py-2 rounded"
            onClick={analyzeProfile}
          >
            Analyze Profile
          </button>

          <button
            className="bg-black text-white px-4 py-2 rounded"
            onClick={getRepos}
          >
            Get Repos
          </button>
        </div>
      </div>

      {/* ------------------ Loading Indicator ------------------ */}
      {loading && <p className="mt-4">Loading…</p>}

      {/* ------------------ PROFILE SECTION ------------------ */}
      {profile?.success && (
        <div className="mt-6 border p-4 rounded">
          <h3 className="text-lg font-bold">Profile Info</h3>

          <img
            className="w-24 rounded mt-4"
            src={profile.profile.avatar_url}
            alt="avatar"
          />

          <p><strong>Name:</strong> {profile.profile.name}</p>
          <p><strong>Bio:</strong> {profile.profile.bio}</p>
          <p><strong>Followers:</strong> {profile.profile.followers}</p>
          <p><strong>Following:</strong> {profile.profile.following}</p>
          <p><strong>Public Repos:</strong> {profile.profile.public_repos}</p>
        </div>
      )}

      {/* ------------------ REPOSITORIES SECTION ------------------ */}
      {Array.isArray(repos) && repos.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold mb-3">Repositories</h3>

          {repos.map((repo, index) => (
            <div key={repo.id || repo.name || index} className="border-b pb-3 mb-3">

              <h4 className="font-semibold">{repo.name}</h4>

              <p className="mt-2 text-sm text-gray-600">
                <strong>README:</strong>
              </p>

              <div className="text-xs text-gray-700 whitespace-pre-wrap mt-1">
                {repo.readme
                  ? repo.readme.slice(0, 200) + "…"
                  : "No README found"}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------ UPDATE README BUTTON ------------------ */}
      {profile?.success && (
        <button
          className="bg-blue-600 text-white px-4 py-2 mt-6 rounded"
          onClick={editReadme}
        >
          Update README
        </button>
      )}
    </div>
  );
};

export default Page;
