"use client";

import getRelevantFiles from "../lib/repo/getRelevantFiles";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import detectAndGroupProjects from "../lib/repo/detectGroupProjects";


export default function GetFilteredFiles({ reponame }) {
  const { data: session, status } = useSession();

  const [repoTree, setRepoTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    if (status !== "authenticated" || !reponame) return;

    const fetchRepoTree = async () => {
      try {
        const username = session.username;
        

        const res = await fetch("/api/repoTree", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, reponame }),
        });

        const data = await res.json();
        setRepoTree(data.tree || []);
      } catch (err) {
        console.error("Failed to fetch repo tree:", err);
      } finally {
        setLoading(false);
        console.log(repoTree)
      }
    };

    fetchRepoTree();
  }, [status, session, reponame]);

  if (loading) {
    return <p>Loading repository files…</p>;
  }

  // ✅ derived data (no state, no async)

    

  return (
    <ul>
      {relevantFiles.map((item) => (
        <li key={item.path}>
          {item.type === "tree" ? "📁" : "📄"} {item.path}
        </li>
      ))}
    </ul>
  );
}
