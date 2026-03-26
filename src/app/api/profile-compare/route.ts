import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { BILLING_FEATURES } from "@/app/lib/billing/plans";
import { BillingAccessError, requirePro } from "@/app/lib/billing/entitlements";
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
    const session = await getServerSession(authOptions);
    if (!session?.username) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
        },
        {
          status: 401,
        }
      );
    }

    await requirePro(session, BILLING_FEATURES.PROFILE_COMPARE);

    const {
      leftUsername = "",
      rightUsername = "",
      forceRefresh = false,
    } = await request.json();

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
    if (error instanceof BillingAccessError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
        },
        {
          status: error.status || 403,
        }
      );
    }

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
