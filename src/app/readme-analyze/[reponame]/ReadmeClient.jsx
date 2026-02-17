"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReadmeBlock from "../readme-analyze-components/ReadmeBlock";
import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import Unauthorized from "@/app/statusCodePages/unauthorized";


export default function ReadmeClient({ reponame }) {
  const { data: session, status } = useSession();
  const [repoTree, setRepoTree] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }

    if (status !== "authenticated" || !session?.username || !reponame) return;

    const fetchRepoTree = async () => {
      try {
        setLoading(true);
        const username = session.username;
        const token = session?.accessToken;

        const res = await fetch("/api/repoTree", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, reponame, token }),
          
        });

        const data = await res.json();
        console.log(data)

        if (!res.ok) {
          throw new Error(data?.error || "Failed to fetch repository tree");
        }

        setRepoTree(Array.isArray(data?.tree) ? data.tree : []);
      } catch (err) {
        console.error("Failed to fetch repo tree:", err);
        setRepoTree([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRepoTree();
  }, [status, session?.username, reponame]);

  const relevantFiles = getRelevantFiles(repoTree, { maxFiles: 120 });

  if (status === "loading" || loading) return <p className="p-4">Loading repo tree...</p>;
  if (status !== "authenticated"){
    return(
     <Unauthorized/>
    )
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">
        {reponame}
      </h1>
      <ReadmeBlock tree={relevantFiles} />
    </div>
  );
}
