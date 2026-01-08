"use client";

import { useSession, signIn, signOut } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();
  console.log(session);


  // 1️⃣ While session is loading
  if (status === "loading") {
    return <p>Loading...</p>;
  }

  // 2️⃣ If not logged in
  if (!session) {
    return (
      <button onClick={() => signIn("github")}>
        Login with GitHub
      </button>
    );
  }

  // 3️⃣ If logged in
  return (
    <div>
      <p>Logged in as: {session.username}</p>
      <p>
        Access Token:{" "}
        {session.accessToken ? "Available" : "Missing"}
      </p>

      <button onClick={() => signOut()}>
        Logout
      </button>
    </div>
  );
}
