import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveSessionGithubUsername, resolveSessionUserId } from "@/app/lib/auth/session";
import { fetchGithubContributionCalendar } from "@/app/lib/githubPublicData";

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!resolveSessionUserId(session)) {
      return jsonError(401, "Authentication required");
    }

    const body = await req.json().catch(() => ({}));
    const sessionUsername = normalizeUsername(resolveSessionGithubUsername(session));
    const requestedUsername = normalizeUsername(body?.username || sessionUsername);

    if (!sessionUsername) {
      return jsonError(403, "Link a GitHub username in your account settings first.");
    }

    if (!requestedUsername) {
      return jsonError(400, "username is required");
    }

    if (requestedUsername !== sessionUsername) {
      return jsonError(403, "You can only read contribution data for your linked GitHub account");
    }

    const accessToken = String(
      process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN || process.env.GH_TOKEN || ""
    ).trim();

    const result = await fetchGithubContributionCalendar({
      username: requestedUsername,
      token: accessToken,
    });

    if (!result?.ok || !result?.data) {
      return jsonError(
        Number(result?.status) || 502,
        result?.error || "Failed to fetch contribution graph data"
      );
    }

    return NextResponse.json(
      {
        ok: true,
        username: requestedUsername,
        totalContributions: Number(result.data?.totalContributions || 0),
        days: Array.isArray(result.data?.days) ? result.data.days : [],
        fetchedAt: String(result.data?.fetchedAt || new Date().toISOString()),
        source: String(result.data?.source || "unknown"),
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(
      500,
      error?.message || "Failed to fetch contribution graph data"
    );
  }
}