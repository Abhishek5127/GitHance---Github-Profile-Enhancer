"use client";
import React, { useState } from "react";


const token = process.env.GITHUB_TOKEN;

const Page = () => {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const editReadme = async () => {
    const res = await fetch("/api/update", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        repo: username,           // user's profile repo
        path: "README.md",
        message: "Auto-updated README",
        content: "# Updated README!\n\nThis was modified by the analyzer app."
      })
    });

    const data = await res.json();
    console.log("Update result:", data);
  };


  const analyzeProfile = async () => {
    if (!username.trim()) return;

    setLoading(true);
    setResult(null);

    const res = await fetch("/api/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });

    const data = await res.json();
    setLoading(false);

    setResult(data);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col gap-4 max-w-md">

        <h2 className="text-xl font-semibold">Enter your Git Username:</h2>

        <input
          className="border-2 p-2"
          name="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. torvalds"
        />

        <button
          className="cursor-pointer bg-black text-white p-2"
          onClick={analyzeProfile}
        >
          Analyze
        </button>
      </div>

      {/* Loading */}
      {loading && <p className="mt-4">Analyzing...</p>}

      {/* Results */}
      {result && result.success && (
        <div className="mt-6 border p-4 rounded">
          <h3 className="text-lg font-bold">Profile Data:</h3>
          <img className="w-32 mt-4 rounded" src={result.profile.avatar_url} />
          <p><strong>Name:</strong> {result.profile.name}</p>
          <p><strong>Bio:</strong> {result.profile.bio}</p>
          <p><strong>Followers</strong> {result.profile.followers}</p>
          <p><strong>Following</strong> {result.profile.following}</p>
          <p><strong>Public Repos:</strong> {result.profile.public_repos}</p>
          <p><strong>Created on:</strong> {result.profile.created_at}</p>
          <p><strong>Last Update on:</strong> {result.profile.updated_at}</p>
          
        </div>
      )}
      {result?.success && (
        <button
          className="mt-4 bg-blue-600 text-white p-2 rounded"
          onClick={editReadme}
        >
          Update README
        </button>
      )}


      {result && result.error && (
        <p className="mt-4 text-red-500">{result.error}</p>
      )}
    </div>
  );
};

export default Page;
