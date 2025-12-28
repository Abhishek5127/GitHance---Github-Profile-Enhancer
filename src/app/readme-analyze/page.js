"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import ReadmeBlock from "./readme-analyze-components/ReadmeBlock";

export default function Page() {
  const { data: session, status } = useSession();
  const [repoTree, setRepoTree] = useState([]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const getRepoData = async () => {
      try {
        const username = session.user?.name; 
        const reponame = "AI-Resume-Builder"; 

        const res = await fetch('/api/repoTree',{
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, reponame }),
        });

        const data = await res.json();
        setRepoTree(data.tree || []);
      } catch (err) {
        console.error(err);
      }
    };

    getRepoData();
  }, [session, status]);

  return (
    <div className="p-6">
      <ReadmeBlock tree={repoTree} />
    </div>
  );
}
