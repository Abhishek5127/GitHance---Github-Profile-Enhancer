import { NextResponse } from "next/server";
import { verifyPassword } from "@/app/lib/auth/passwords";
import { createOtpChallenge, findUserByEmail, normalizeEmail } from "@/app/lib/auth/users";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = normalizeEmail(body?.email || "");
    const password = String(body?.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await findUserByEmail(email);
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const challenge = await createOtpChallenge({
      email,
      purpose: "login",
      meta: {
        userId: user.userId,
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
        error: error instanceof Error ? error.message : "Failed to send login code.",
      },
      { status: 500 }
    );
  }
}
