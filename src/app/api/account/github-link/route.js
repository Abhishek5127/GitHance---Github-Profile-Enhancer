import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  isValidGithubUsername,
  normalizeGithubUsername,
  updateUserGithubUsername,
} from "@/app/lib/auth/users";
import { resolveSessionUserId, resolveSessionGithubUsername } from "@/app/lib/auth/session";
import { upsertGithubUserIdentity } from "@/app/lib/githubStats";

export const runtime = "nodejs";

async function fetchGithubProfile(username) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.message || "GitHub account not found");
  }

  return payload;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = resolveSessionUserId(session);
  if (!userId) {
    return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    githubUsername: resolveSessionGithubUsername(session),
  });
}

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const githubUsername = normalizeGithubUsername(body?.githubUsername || "");

    if (!githubUsername || !isValidGithubUsername(githubUsername)) {
      return NextResponse.json(
        { ok: false, error: "Enter a valid GitHub username." },
        { status: 400 }
      );
    }

    const profile = await fetchGithubProfile(githubUsername);
    const user = await updateUserGithubUsername({ userId, githubUsername });
    await upsertGithubUserIdentity({
      username: githubUsername,
      name: profile?.name || "",
      email: profile?.email || "",
      avatarUrl: profile?.avatar_url || "",
      githubId: profile?.id || null,
      source: "manual_link",
    });

    return NextResponse.json({
      ok: true,
      githubUsername: user?.githubUsername || githubUsername,
      profile: {
        login: profile?.login || githubUsername,
        name: profile?.name || "",
        avatarUrl: profile?.avatar_url || "",
        htmlUrl: profile?.html_url || "",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to link GitHub account.";
    const status = message.toLowerCase().includes("not found") ? 404 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    const userId = resolveSessionUserId(session);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    await updateUserGithubUsername({ userId, githubUsername: "" });
    return NextResponse.json({ ok: true, githubUsername: "" });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to unlink GitHub account.",
      },
      { status: 500 }
    );
  }
}
