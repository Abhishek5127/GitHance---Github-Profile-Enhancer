import { NextResponse } from "next/server";
import { hashPassword, validatePassword } from "@/app/lib/auth/passwords";
import {
  createOtpChallenge,
  findUserByEmail,
  normalizeDisplayName,
  normalizeEmail,
} from "@/app/lib/auth/users";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email || "");
    const password = String(body?.password || "");
    const displayName = normalizeDisplayName(body?.name || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ ok: false, error: passwordError }, { status: 400 });
    }

    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const challenge = await createOtpChallenge({
      email,
      purpose: "signup",
      meta: {
        displayName: displayName || email.split("@")[0],
        passwordHash: hashPassword(password),
      },
    });

    return NextResponse.json({
      ok: true,
      challengeId: challenge.challengeId,
      expiresAt: challenge.expiresAt,
      ...(challenge.debugCode ? { debugCode: challenge.debugCode } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to send signup code.",
      },
      { status: 500 }
    );
  }
}
