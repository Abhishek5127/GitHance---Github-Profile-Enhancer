"use client"
import { getRelevantFiles } from "../lib/repo/getRelevantFiles";
import { useSession } from "next-auth/react";
import { useState,useEffect } from "react";
export default function getFilteredFiles({ reponame }) {
  const { data: session, status } = useSession();
  const [repoTree, setRepoTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchRepoTree = async () => {
      try {
        const username =session.username;
        
        

        const res = await fetch("/api/repoTree", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, reponame }),
        });

        const data = await res.json();
        setRepoTree(data.tree || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoTree();
  }, [status, session]);


const relevantFiles = getRelevantFiles(repoTree);

return (
  <ul>
    {relevantFiles.map((item) => (
      <li key={item.path}>
        {item.type === "folder" ? "📁" : "📄"} {item.path}
      </li>
    ))}
  </ul>
);
}