import { randomUUID, createHash } from "node:crypto";
import { getMongoDb, isMongoConfigured } from "@/app/lib/mongodb";
import { sendOtpEmail } from "@/app/lib/auth/email";

const USERS_COLLECTION = "app_users";
const OTP_CHALLENGES_COLLECTION = "auth_otp_challenges";
const OTP_TTL_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

let indexesEnsured = false;

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function normalizeDisplayName(value) {
  return String(value || "").trim().slice(0, 80);
}

export function normalizeGithubUsername(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^@+/, "");
}

export function isValidGithubUsername(value) {
  return /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(
    normalizeGithubUsername(value)
  );
}

function hashOtpCode(challengeId, code) {
  const otpSecret = String(process.env.AUTH_OTP_SECRET || process.env.NEXTAUTH_SECRET || "githance")
    .trim();

  return createHash("sha256")
    .update(`${otpSecret}:${String(challengeId || "").trim()}:${String(code || "").trim()}`)
    .digest("hex");
}

async function getAuthCollections() {
  const db = await getMongoDb();

  if (!indexesEnsured) {
    await Promise.all([
      db.collection(USERS_COLLECTION).createIndex({ email: 1 }, { unique: true }),
      db.collection(USERS_COLLECTION).createIndex(
        { githubUsername: 1 },
        { unique: true, sparse: true }
      ),
      db.collection(OTP_CHALLENGES_COLLECTION).createIndex(
        { expiresAt: 1 },
        { expireAfterSeconds: 0 }
      ),
      db.collection(OTP_CHALLENGES_COLLECTION).createIndex({ email: 1, purpose: 1 }),
    ]);

    indexesEnsured = true;
  }

  return {
    usersCollection: db.collection(USERS_COLLECTION),
    otpChallengesCollection: db.collection(OTP_CHALLENGES_COLLECTION),
  };
}

function toPublicUser(record) {
  if (!record) return null;

  return {
    userId: normalizeEmail(record.email),
    email: normalizeEmail(record.email),
    name: normalizeDisplayName(record.name) || normalizeEmail(record.email),
    githubUsername: normalizeGithubUsername(record.githubUsername),
    emailVerifiedAt: record.emailVerifiedAt ? new Date(record.emailVerifiedAt) : null,
    createdAt: record.createdAt ? new Date(record.createdAt) : null,
    updatedAt: record.updatedAt ? new Date(record.updatedAt) : null,
  };
}

export async function findUserByEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !isMongoConfigured()) {
    return null;
  }

  const { usersCollection } = await getAuthCollections();
  const user = await usersCollection.findOne({ email: normalizedEmail });
  if (!user) return null;

  return {
    ...toPublicUser(user),
    passwordHash: String(user.passwordHash || ""),
  };
}

export async function createUser({ email, passwordHash, name = "" }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !passwordHash || !isMongoConfigured()) {
    throw new Error("Unable to create user");
  }

  const { usersCollection } = await getAuthCollections();
  const now = new Date();
  const document = {
    email: normalizedEmail,
    passwordHash: String(passwordHash || ""),
    name: normalizeDisplayName(name) || normalizedEmail.split("@")[0],
    githubUsername: "",
    emailVerifiedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await usersCollection.insertOne(document);
  return toPublicUser(document);
}

export async function updateUserGithubUsername({ userId, githubUsername }) {
  const normalizedUserId = normalizeEmail(userId);
  if (!normalizedUserId || !isMongoConfigured()) {
    throw new Error("Authentication required");
  }

  const normalizedGithubUsername = normalizeGithubUsername(githubUsername);
  const { usersCollection } = await getAuthCollections();
  const now = new Date();

  await usersCollection.updateOne(
    { email: normalizedUserId },
    {
      $set: {
        githubUsername: normalizedGithubUsername,
        updatedAt: now,
      },
    }
  );

  const updated = await usersCollection.findOne({ email: normalizedUserId });
  return toPublicUser(updated);
}

export async function createOtpChallenge({ email, purpose, meta = {} }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || !purpose || !isMongoConfigured()) {
    throw new Error("Unable to create verification challenge");
  }

  const { otpChallengesCollection } = await getAuthCollections();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const challengeId = randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60 * 1000);

  await otpChallengesCollection.deleteMany({
    email: normalizedEmail,
    purpose: String(purpose || "").trim(),
    usedAt: { $exists: false },
  });

  await otpChallengesCollection.insertOne({
    _id: challengeId,
    email: normalizedEmail,
    purpose: String(purpose || "").trim(),
    meta: meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {},
    codeHash: hashOtpCode(challengeId, code),
    attempts: 0,
    createdAt: now,
    expiresAt,
  });

  const delivery = await sendOtpEmail({
    email: normalizedEmail,
    code,
    purpose,
  });

  return {
    challengeId,
    expiresAt: expiresAt.toISOString(),
    debugCode: delivery?.debugCode || "",
  };
}

export async function consumeOtpChallenge({ challengeId, email, code, purpose }) {
  const normalizedChallengeId = String(challengeId || "").trim();
  const normalizedEmail = normalizeEmail(email);
  const normalizedPurpose = String(purpose || "").trim();
  const normalizedCode = String(code || "").trim();

  if (!normalizedChallengeId || !normalizedEmail || !normalizedPurpose || !normalizedCode) {
    throw new Error("Verification code is required");
  }

  if (!isMongoConfigured()) {
    throw new Error("Database is not configured");
  }

  const { otpChallengesCollection } = await getAuthCollections();
  const challenge = await otpChallengesCollection.findOne({
    _id: normalizedChallengeId,
    email: normalizedEmail,
    purpose: normalizedPurpose,
  });

  if (!challenge) {
    throw new Error("Verification code has expired. Request a new code.");
  }

  if (challenge.usedAt) {
    throw new Error("Verification code was already used. Request a new code.");
  }

  if (new Date(challenge.expiresAt).getTime() < Date.now()) {
    throw new Error("Verification code has expired. Request a new code.");
  }

  const isMatch = challenge.codeHash === hashOtpCode(normalizedChallengeId, normalizedCode);
  if (!isMatch) {
    const nextAttempts = Math.max(0, Number(challenge.attempts || 0)) + 1;
    await otpChallengesCollection.updateOne(
      { _id: normalizedChallengeId },
      {
        $set: {
          attempts: nextAttempts,
          ...(nextAttempts >= OTP_MAX_ATTEMPTS ? { usedAt: new Date() } : {}),
        },
      }
    );

    throw new Error("Verification code is invalid");
  }

  await otpChallengesCollection.updateOne(
    { _id: normalizedChallengeId },
    {
      $set: {
        usedAt: new Date(),
      },
    }
  );

  return challenge.meta && typeof challenge.meta === "object" ? challenge.meta : {};
}
