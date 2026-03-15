import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { compareProfiles } from "@/app/profile-compare/profileCompareServerService";

export const runtime = "nodejs";

function getErrorStatus(message: string) {
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

export async function POST(request: Request) {
  try {
    const {
      leftUsername = "",
      rightUsername = "",
      forceRefresh = false,
    } = await request.json();

    const session = await getServerSession(authOptions);
    const sessionToken = String(session?.accessToken || "").trim();
    const serverToken = String(
      process.env.GITHUB_TOKEN ||
        process.env.GITHUB_ACCESS_TOKEN ||
        process.env.GH_TOKEN ||
        ""
    ).trim();

    const comparison = await compareProfiles(leftUsername, rightUsername, {
      forceRefresh: Boolean(forceRefresh),
      token: sessionToken || serverToken,
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
