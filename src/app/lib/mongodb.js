import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "";

function resolveDbName() {
  if (MONGODB_DB_NAME) return MONGODB_DB_NAME;

  try {
    const parsed = new URL(MONGODB_URI);
    const pathName = String(parsed.pathname || "").replace(/^\//, "");
    if (pathName) return pathName;
  } catch {
    // ignore parse errors and fallback
  }

  return "githance";
}

function createMissingUriError() {
  return new Error("MONGODB_URI is not configured");
}

export function isMongoConfigured() {
  return Boolean(MONGODB_URI);
}

let cachedClient = null;
let cachedClientPromise = null;

export async function getMongoClient() {
  if (!isMongoConfigured()) {
    throw createMissingUriError();
  }

  if (cachedClient) return cachedClient;
  if (!cachedClientPromise) {
    cachedClientPromise = MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 1,
    });
  }

  cachedClient = await cachedClientPromise;
  return cachedClient;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(resolveDbName());
}
