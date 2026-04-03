import { BILLING_FEATURES, getFeatureLabel } from "@/app/lib/billing/plans";
import { getActiveSubscriptionByUserId } from "@/app/lib/billing/subscriptions";

export class BillingAccessError extends Error {
  constructor(message, status = 403, code = "billing_access_denied") {
    super(message);
    this.name = "BillingAccessError";
    this.status = status;
    this.code = code;
  }
}

export function resolveBillingUserId(user) {
  if (!user) return "";

  if (typeof user === "string") {
    return user.trim().toLowerCase();
  }

  return String(
    user?.userId || user?.user?.email || user?.email || user?.username || user?.user?.name || ""
  )
    .trim()
    .toLowerCase();
}

export async function requirePro(user, featureName = BILLING_FEATURES.REPOSITORY_SECURITY) {
  const userId = resolveBillingUserId(user);

  if (!userId) {
    throw new BillingAccessError("Authentication required", 401, "auth_required");
  }

  const subscription = await getActiveSubscriptionByUserId(userId);
  if (!subscription) {
    throw new BillingAccessError("This feature requires Githance Pro", 403, "pro_required");
  }

  return {
    userId,
    featureName,
    featureLabel: getFeatureLabel(featureName),
    subscription,
  };
}
