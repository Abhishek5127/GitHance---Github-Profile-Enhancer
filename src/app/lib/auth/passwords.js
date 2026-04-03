import crypto from "node:crypto";

const HASH_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export function validatePassword(password) {
  const value = String(password || "");

  if (value.length < 8) {
    return "Password must be at least 8 characters long.";
  }

  if (value.length > 128) {
    return "Password must be 128 characters or fewer.";
  }

  return "";
}

export function hashPassword(password) {
  const value = String(password || "");
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(value, salt, KEY_LENGTH).toString("hex");
  return `${HASH_PREFIX}:${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  const value = String(password || "");
  const normalizedHash = String(storedHash || "");
  const [prefix, salt, digest] = normalizedHash.split(":");

  if (prefix !== HASH_PREFIX || !salt || !digest) {
    return false;
  }

  try {
    const derivedKey = crypto.scryptSync(value, salt, KEY_LENGTH);
    const digestBuffer = Buffer.from(digest, "hex");

    if (derivedKey.length !== digestBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, digestBuffer);
  } catch {
    return false;
  }
}
