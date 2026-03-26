import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import {
  BILLING_FEATURES,
  getProPlanConfig,
  getSupportedProPlans,
} from "@/app/lib/billing/plans";
import { getSubscriptionForUser } from "@/app/lib/billing/subscriptions";

export const runtime = "nodejs";

function buildFeatures(subscription) {
  const isPro = Boolean(subscription?.isPro);

  return {
    [BILLING_FEATURES.REPOSITORY_SECURITY]: isPro,
    [BILLING_FEATURES.PROFILE_COMPARE]: isPro,
    [BILLING_FEATURES.README_AUTO_UPDATE]: isPro,
  };
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.username) {
      return NextResponse.json({
        ok: true,
        subscription: {
          userId: "",
          plan: "free",
          effectivePlan: "free",
          status: "expired",
          isPro: false,
          autoUpdateEnabled: false,
          autoUpdateRepo: "",
          startDate: null,
          endDate: null,
        },
        features: buildFeatures(null),
        plan: getProPlanConfig(),
        plans: getSupportedProPlans(),
      });
    }

    const subscription = await getSubscriptionForUser(session.username);

    return NextResponse.json({
      ok: true,
      subscription,
      features: buildFeatures(subscription),
      plan: getProPlanConfig(),
      plans: getSupportedProPlans(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to load billing state",
      },
      { status: 500 }
    );
  }
}
