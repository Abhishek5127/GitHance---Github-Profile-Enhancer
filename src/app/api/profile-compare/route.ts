import { NextResponse } from "next/server";
import { compareProfiles } from "@/app/profile-compare/profileCompareServerService";

export const runtime = "nodejs";

function getErrorStatus(message) {
  const normalizedMessage = String(message || "").toLowerCase();

  if (normalizedMessage.includes("required") || normalizedMessage.includes("different")) {
    return 400;
  }

  if (normalizedMessage.includes("not found")) {
    return 404;
  }

  if (normalizedMessage.includes("rate limit")) {
    return 429;
  }

  return 502;
}

export async function POST(request) {
  try {
    const {
      leftUsername = "",
      rightUsername = "",
      forceRefresh = false,
    } = await request.json();

    const serverToken = String(
      process.env.GITHUB_TOKEN ||
        process.env.GITHUB_ACCESS_TOKEN ||
        process.env.GH_TOKEN ||
        ""
    ).trim();

    const comparison = await compareProfiles(leftUsername, rightUsername, {
      forceRefresh: Boolean(forceRefresh),
      token: serverToken,
    });

    return NextResponse.json({
      ok: true,
      comparison,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to compare these GitHub profiles right now.";

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      {
        status: getErrorStatus(message),
      }
    );
  }
}
