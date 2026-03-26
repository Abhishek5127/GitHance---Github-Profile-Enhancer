import { getMongoDb, isMongoConfigured } from "@/app/lib/mongodb";
import { getProPlanConfig, normalizeBillingCurrency } from "@/app/lib/billing/plans";

const SUBSCRIPTIONS_COLLECTION = "subscriptions";
const BILLING_ORDERS_COLLECTION = "billing_orders";

let mongoIndexesEnsured = false;

function normalizeUserId(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function normalizePlan(value) {
  return String(value || "").trim().toLowerCase() === "pro" ? "pro" : "free";
}

function normalizeStatus(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "active" || normalized === "expired" || normalized === "cancelled") {
    return normalized;
  }
  return "expired";
}

function toDate(value) {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

async function getBillingCollections() {
  const db = await getMongoDb();

  if (!mongoIndexesEnsured) {
    const subscriptionsCollection = db.collection(SUBSCRIPTIONS_COLLECTION);
    const billingOrdersCollection = db.collection(BILLING_ORDERS_COLLECTION);

    await Promise.all([
      subscriptionsCollection.createIndex({ userId: 1 }, { unique: true }),
      subscriptionsCollection.createIndex({ status: 1, endDate: 1 }),
      billingOrdersCollection.createIndex({ orderId: 1 }, { unique: true }),
      billingOrdersCollection.createIndex({ userId: 1, createdAt: -1 }),
      billingOrdersCollection.createIndex({ paymentSessionId: 1 }, { sparse: true }),
    ]);

    mongoIndexesEnsured = true;
  }

  return {
    subscriptionsCollection: db.collection(SUBSCRIPTIONS_COLLECTION),
    billingOrdersCollection: db.collection(BILLING_ORDERS_COLLECTION),
  };
}

export function buildFreeSubscription(userId = "") {
  return {
    userId: normalizeUserId(userId),
    plan: "free",
    effectivePlan: "free",
    status: "expired",
    paymentProvider: "cashfree",
    orderId: "",
    startDate: null,
    endDate: null,
    autoUpdateEnabled: false,
    autoUpdateRepo: "",
    createdAt: null,
    updatedAt: null,
    isPro: false,
  };
}

function toPublicSubscription(record, fallbackUserId = "") {
  const startDate = toDate(record?.startDate);
  const endDate = toDate(record?.endDate);
  const plan = normalizePlan(record?.plan);
  const status = normalizeStatus(record?.status);
  const now = Date.now();
  const isPro = plan === "pro" && status === "active" && Boolean(endDate && endDate.getTime() > now);

  return {
    userId: normalizeUserId(record?.userId || fallbackUserId),
    plan,
    effectivePlan: isPro ? "pro" : "free",
    status: isPro ? "active" : status,
    paymentProvider: String(record?.paymentProvider || "cashfree"),
    orderId: String(record?.orderId || ""),
    startDate,
    endDate,
    autoUpdateEnabled: Boolean(record?.autoUpdateEnabled && isPro),
    autoUpdateRepo: String(record?.autoUpdateRepo || ""),
    createdAt: toDate(record?.createdAt),
    updatedAt: toDate(record?.updatedAt),
    isPro,
  };
}

async function expireSubscriptionIfNeeded(collection, record) {
  const publicRecord = toPublicSubscription(record, record?.userId);

  if (publicRecord.isPro || publicRecord.status !== "active") {
    return publicRecord;
  }

  const now = new Date();
  await collection.updateOne(
    { userId: publicRecord.userId },
    {
      $set: {
        status: "expired",
        updatedAt: now,
        autoUpdateEnabled: false,
      },
    }
  );

  return {
    ...publicRecord,
    status: "expired",
    autoUpdateEnabled: false,
    updatedAt: now,
  };
}

export async function getSubscriptionForUser(userId) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId || !isMongoConfigured()) {
    return buildFreeSubscription(normalizedUserId);
  }

  try {
    const { subscriptionsCollection } = await getBillingCollections();
    const record = await subscriptionsCollection.findOne({ userId: normalizedUserId });

    if (!record) {
      return buildFreeSubscription(normalizedUserId);
    }

    return await expireSubscriptionIfNeeded(subscriptionsCollection, record);
  } catch {
    return buildFreeSubscription(normalizedUserId);
  }
}

export async function getActiveSubscriptionByUserId(userId) {
  const subscription = await getSubscriptionForUser(userId);
  return subscription.isPro ? subscription : null;
}

export async function upsertBillingOrder({
  orderId,
  userId,
  plan = "pro",
  amount,
  currency,
  cfOrderId = "",
  paymentSessionId = "",
  orderStatus = "ACTIVE",
  returnUrl = "",
  source = "",
  metadata = {},
}) {
  if (!isMongoConfigured()) {
    return null;
  }

  const normalizedOrderId = String(orderId || "").trim();
  const normalizedUserId = normalizeUserId(userId);
  const normalizedCurrency = normalizeBillingCurrency(currency, "INR");
  if (!normalizedOrderId || !normalizedUserId) {
    return null;
  }

  const { billingOrdersCollection } = await getBillingCollections();
  const now = new Date();

  await billingOrdersCollection.updateOne(
    { orderId: normalizedOrderId },
    {
      $setOnInsert: {
        createdAt: now,
      },
      $set: {
        userId: normalizedUserId,
        plan: normalizePlan(plan),
        paymentProvider: "cashfree",
        amount: Number(amount || 0),
        currency: normalizedCurrency,
        cfOrderId: String(cfOrderId || "").trim(),
        paymentSessionId: String(paymentSessionId || "").trim(),
        orderStatus: String(orderStatus || "").trim().toUpperCase(),
        returnUrl: String(returnUrl || "").trim(),
        source: String(source || "").trim(),
        metadata:
          metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {},
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return billingOrdersCollection.findOne({ orderId: normalizedOrderId });
}

export async function getBillingOrderById(orderId) {
  if (!isMongoConfigured()) {
    return null;
  }

  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    return null;
  }

  const { billingOrdersCollection } = await getBillingCollections();
  return billingOrdersCollection.findOne({ orderId: normalizedOrderId });
}

export async function markBillingOrderState({
  orderId,
  orderStatus = "",
  paymentStatus = "",
  cfOrderId = "",
  paymentId = "",
  paymentTime = null,
  providerPayload = null,
  idempotencyKey = "",
}) {
  if (!isMongoConfigured()) {
    return null;
  }

  const normalizedOrderId = String(orderId || "").trim();
  if (!normalizedOrderId) {
    return null;
  }

  const { billingOrdersCollection } = await getBillingCollections();
  const now = new Date();
  const nextPaymentTime = toDate(paymentTime) || null;

  await billingOrdersCollection.updateOne(
    { orderId: normalizedOrderId },
    {
      $set: {
        ...(orderStatus ? { orderStatus: String(orderStatus).trim().toUpperCase() } : {}),
        ...(paymentStatus ? { paymentStatus: String(paymentStatus).trim().toUpperCase() } : {}),
        ...(cfOrderId ? { cfOrderId: String(cfOrderId).trim() } : {}),
        ...(paymentId ? { paymentId: String(paymentId).trim() } : {}),
        ...(nextPaymentTime ? { paymentTime: nextPaymentTime } : {}),
        ...(providerPayload ? { providerPayload } : {}),
        ...(idempotencyKey ? { lastWebhookIdempotencyKey: String(idempotencyKey).trim() } : {}),
        updatedAt: now,
      },
    }
  );

  return billingOrdersCollection.findOne({ orderId: normalizedOrderId });
}

export async function activateProSubscriptionFromOrder({
  orderId,
  userId,
  cfOrderId = "",
  paymentId = "",
  paymentTime = null,
  amount,
  currency,
  providerPayload = null,
}) {
  if (!isMongoConfigured()) {
    return buildFreeSubscription(userId);
  }

  const normalizedOrderId = String(orderId || "").trim();
  const normalizedUserId = normalizeUserId(userId);
  const normalizedCurrency = normalizeBillingCurrency(currency, "INR");
  if (!normalizedOrderId || !normalizedUserId) {
    return buildFreeSubscription(normalizedUserId);
  }

  const { subscriptionsCollection, billingOrdersCollection } = await getBillingCollections();
  const now = new Date();
  const planConfig = getProPlanConfig(normalizedCurrency);

  await billingOrdersCollection.updateOne(
    { orderId: normalizedOrderId },
    {
      $setOnInsert: {
        createdAt: now,
        userId: normalizedUserId,
        plan: "pro",
        paymentProvider: "cashfree",
      },
      $set: {
        cfOrderId: String(cfOrderId || "").trim(),
        paymentId: String(paymentId || "").trim(),
        paymentStatus: "SUCCESS",
        orderStatus: "PAID",
        amount: Number(amount || planConfig.amount),
        currency: normalizedCurrency,
        paymentTime: toDate(paymentTime) || now,
        providerPayload,
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  const claimResult = await billingOrdersCollection.updateOne(
    {
      orderId: normalizedOrderId,
      entitlementAppliedAt: { $exists: false },
    },
    {
      $set: {
        entitlementAppliedAt: now,
        updatedAt: now,
      },
    }
  );

  if (!claimResult.modifiedCount) {
    return getSubscriptionForUser(normalizedUserId);
  }

  const current = await subscriptionsCollection.findOne({ userId: normalizedUserId });
  const currentPublic = toPublicSubscription(current, normalizedUserId);
  const currentEndDate = toDate(currentPublic.endDate);
  const startDate =
    currentPublic.isPro && currentEndDate && currentEndDate.getTime() > now.getTime()
      ? currentEndDate
      : now;
  const endDate = addDays(startDate, planConfig.durationDays);

  await subscriptionsCollection.updateOne(
    { userId: normalizedUserId },
    {
      $setOnInsert: {
        userId: normalizedUserId,
        createdAt: currentPublic.createdAt || now,
      },
      $set: {
        plan: "pro",
        status: "active",
        paymentProvider: "cashfree",
        orderId: normalizedOrderId,
        cfOrderId: String(cfOrderId || "").trim(),
        paymentId: String(paymentId || "").trim(),
        amount: Number(amount || planConfig.amount),
        currency: normalizedCurrency,
        startDate,
        endDate,
        autoUpdateEnabled: Boolean(currentPublic.autoUpdateEnabled),
        autoUpdateRepo: String(currentPublic.autoUpdateRepo || ""),
        updatedAt: now,
      },
    },
    { upsert: true }
  );

  return getSubscriptionForUser(normalizedUserId);
}

export async function setAutoUpdatePreference({ userId, enabled, repository = "" }) {
  if (!isMongoConfigured()) {
    return buildFreeSubscription(userId);
  }

  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) {
    return buildFreeSubscription(normalizedUserId);
  }

  const activeSubscription = await getActiveSubscriptionByUserId(normalizedUserId);
  if (!activeSubscription) {
    return buildFreeSubscription(normalizedUserId);
  }

  const { subscriptionsCollection } = await getBillingCollections();
  const now = new Date();

  await subscriptionsCollection.updateOne(
    { userId: normalizedUserId },
    {
      $set: {
        autoUpdateEnabled: Boolean(enabled),
        autoUpdateRepo: Boolean(enabled) ? String(repository || "").trim() : "",
        updatedAt: now,
      },
    }
  );

  return getSubscriptionForUser(normalizedUserId);
}
