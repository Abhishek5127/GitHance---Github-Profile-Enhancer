import { NextResponse } from "next/server";
import { getMongoDb, isMongoConfigured } from "@/app/lib/mongodb";

export const runtime = "nodejs";

const FEEDBACK_COLLECTION = "landing_feedback";
const MAX_MESSAGE_LENGTH = 1200;

let indexesEnsured = false;

function normalizeMessage(value) {
  return String(value || "").trim();
}

function normalizePage(value) {
  const normalized = String(value || "/").trim();
  if (!normalized) return "/";
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

async function getFeedbackCollection() {
  const db = await getMongoDb();
  const collection = db.collection(FEEDBACK_COLLECTION);

  if (!indexesEnsured) {
    await Promise.all([
      collection.createIndex({ createdAt: -1 }),
      collection.createIndex({ page: 1, createdAt: -1 }),
    ]);
    indexesEnsured = true;
  }

  return collection;
}

export async function POST(request) {
  if (!isMongoConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "MONGODB_URI is not configured",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const message = normalizeMessage(body?.message);
    const page = normalizePage(body?.page);

    if (message.length < 3) {
      return NextResponse.json(
        {
          ok: false,
          error: "Feedback must be at least 3 characters long",
        },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          ok: false,
          error: `Feedback must be ${MAX_MESSAGE_LENGTH} characters or less`,
        },
        { status: 400 }
      );
    }

    const collection = await getFeedbackCollection();
    const result = await collection.insertOne({
      message,
      page,
      source: "landing_feedback_widget",
      createdAt: new Date(),
    });

    return NextResponse.json({
      ok: true,
      id: String(result.insertedId),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to save feedback",
      },
      { status: 500 }
    );
  }
}
