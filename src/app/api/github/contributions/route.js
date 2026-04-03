import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { resolveSessionGithubUsername, resolveSessionUserId } from "@/app/lib/auth/session";

const DAY_MS = 24 * 60 * 60 * 1000;
const GITHUB_GRAPHQL_URL = "https://api.github.com/graphql";
const GRAPHQL_QUERY = `
  query ContributionCalendar($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      contributionsCollection(from: $from, to: $to) {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function toIsoDate(value) {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "";

  return new Date(
    Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate())
  )
    .toISOString()
    .slice(0, 10);
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

    if (!accessToken) {
      return jsonError(503, "GitHub contribution preview requires a server GitHub token.");
    }

    const now = new Date();
    const from = new Date(now.getTime() - 370 * DAY_MS);

    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: {
          login: requestedUsername,
          from: from.toISOString(),
          to: now.toISOString(),
        },
      }),
      cache: "no-store",
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.errors?.length) {
      const message =
        payload?.errors?.[0]?.message ||
        payload?.message ||
        "Failed to fetch contribution graph data";
      return jsonError(response.status || 502, message, payload?.errors || payload);
    }

    const calendar =
      payload?.data?.user?.contributionsCollection?.contributionCalendar || null;
    const weeks = Array.isArray(calendar?.weeks) ? calendar.weeks : [];

    const days = weeks
      .flatMap((week) =>
        Array.isArray(week?.contributionDays) ? week.contributionDays : []
      )
      .map((entry) => ({
        date: toIsoDate(entry?.date),
        count: Math.max(0, Math.floor(Number(entry?.contributionCount || 0))),
      }))
      .filter((entry) => entry.date);

    return NextResponse.json(
      {
        ok: true,
        username: requestedUsername,
        totalContributions: Number(calendar?.totalContributions || 0),
        days,
        fetchedAt: new Date().toISOString(),
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
