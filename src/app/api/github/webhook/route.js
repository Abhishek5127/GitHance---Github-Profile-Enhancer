import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { recordPushEvent, recordRepositoryEvent } from "@/app/lib/githubStats";
import { syncStatsReadmeForPush } from "@/app/lib/readmeStatsSync";

function safeCompareSignature(left, right) {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyGithubSignature(payloadBody, signatureHeader, webhookSecret) {
  if (!webhookSecret) return true;
  if (!signatureHeader) return false;

  const expected = `sha256=${crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadBody)
    .digest("hex")}`;

  return safeCompareSignature(expected, signatureHeader);
}

function isGitHanceReadmeSyncPush(payload) {
  const commits = Array.isArray(payload?.commits) ? payload.commits : [];
  if (!commits.length) return false;

  return commits.some((commit) =>
    String(commit?.message || "")
      .toLowerCase()
      .includes("chore: refresh githance stats")
  );
}

export async function POST(req) {
  const eventName = req.headers.get("x-github-event") || "";
  const deliveryId = req.headers.get("x-github-delivery") || "";
  const signatureHeader = req.headers.get("x-hub-signature-256") || "";
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "";

  if (!webhookSecret) {
    return NextResponse.json(
      {
        ok: false,
        error: "GITHUB_WEBHOOK_SECRET is not configured",
      },
      { status: 500 }
    );
  }

  const payloadBody = await req.text();
  if (!payloadBody) {
    return NextResponse.json(
      { ok: false, error: "Missing webhook payload" },
      { status: 400 }
    );
  }

  const signatureValid = verifyGithubSignature(
    payloadBody,
    signatureHeader,
    webhookSecret
  );
  if (!signatureValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  let payload = null;
  try {
    payload = JSON.parse(payloadBody);
  } catch {
    return NextResponse.json(
      { ok: false, error: "Webhook payload must be JSON" },
      { status: 400 }
    );
  }

  if (eventName === "ping") {
    return NextResponse.json({
      ok: true,
      event: "ping",
      zen: payload?.zen || "",
    });
  }

  if (eventName === "push") {
    if (isGitHanceReadmeSyncPush(payload)) {
      return NextResponse.json({
        ok: true,
        ignored: true,
        reason: "githance_readme_sync_commit",
        event: eventName,
        delivery_id: deliveryId,
      });
    }

    const result = await recordPushEvent({
      deliveryId,
      payload,
    });
    let readmeSync = null;

    if (result?.ok && !result?.idempotent) {
      readmeSync = await syncStatsReadmeForPush({
        username: result?.github_username || payload?.sender?.login || "",
        installationId: result?.installation_id || payload?.installation?.id || null,
        cacheKey: result?.stats?.last_updated || Date.now(),
      });
    }

    const status = Number(result?.status) || (result.ok ? 200 : 400);
    return NextResponse.json(
      {
        event: eventName,
        delivery_id: deliveryId,
        readme_sync: readmeSync,
        ...result,
      },
      { status }
    );
  }

  if (eventName === "repository") {
    const result = await recordRepositoryEvent({
      deliveryId,
      payload,
    });

    const status = Number(result?.status) || (result.ok ? 200 : 400);
    return NextResponse.json(
      {
        event: eventName,
        delivery_id: deliveryId,
        ...result,
      },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    ignored: true,
    event: eventName,
    delivery_id: deliveryId,
  });
}
