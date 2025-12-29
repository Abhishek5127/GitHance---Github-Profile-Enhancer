"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReadmeBlock from "../readme-analyze-components/ReadmeBlock";

export default function ReadmeClient({ reponame }) {
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

  if (loading) return <p className="p-4">Loading repo tree...</p>;

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        {reponame}
      </h1>
      <ReadmeBlock tree={repoTree} />
    </div>
  );
}
