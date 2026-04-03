import { NextResponse } from "next/server";
import { fetchGithubContributionCalendar } from "@/app/lib/githubPublicData";

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
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
    const body = await req.json().catch(() => ({}));
    const requestedUsername = normalizeUsername(body?.username);

    if (!requestedUsername) {
      return jsonError(400, "username is required");
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
        username: normalizeUsername(result.data?.username || requestedUsername),
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
