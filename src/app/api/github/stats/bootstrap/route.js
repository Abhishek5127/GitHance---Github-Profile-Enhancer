import { NextResponse } from "next/server";
import { bootstrapGithubStatsFromEvents } from "@/app/lib/githubStats";
import { createGithubAppJwt, isGithubAppConfigured } from "@/app/lib/githubAppAuth";
import {
  buildGithubRestHeaders,
  fetchGithubRecentEvents,
  resolveGithubUsername,
} from "@/app/lib/githubPublicData";

const GITHUB_API = "https://api.github.com";
const GITHUB_API_VERSION = "2022-11-28";

async function resolveInstallationId({ username, installationId }) {
  const explicit = Number(installationId);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }

  if (!username || !isGithubAppConfigured()) {
    return null;
  }

  try {
    const appJwt = createGithubAppJwt();
    const response = await fetch(`${GITHUB_API}/app/installations?per_page=100`, {
      headers: buildGithubRestHeaders(appJwt, {
        Authorization: `Bearer ${appJwt}`,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) return null;

    const installations = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.installations)
        ? payload.installations
        : [];

    const normalizedUsername = String(username || "")
      .trim()
      .toLowerCase();
    if (!normalizedUsername) return null;

    const match = installations.find((installation) => {
      const accountLogin = String(installation?.account?.login || "")
        .trim()
        .toLowerCase();
      return accountLogin === normalizedUsername;
    });

    const resolved = Number(match?.id);
    if (!Number.isFinite(resolved) || resolved <= 0) return null;
    return Math.floor(resolved);
  } catch {
    return null;
  }
}

export async function POST(req) {
  try {
    const {
      username = "",
      token = "",
      installationId = null,
      force = false,
    } = await req.json();

    const resolvedUsername = await resolveGithubUsername({
      username,
      token,
    });

    if (!resolvedUsername) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unable to resolve GitHub username",
        },
        { status: 400 }
      );
    }

    const resolvedInstallationId = await resolveInstallationId({
      username: resolvedUsername,
      installationId,
    });

    const events = await fetchGithubRecentEvents({
      username: resolvedUsername,
      token,
      maxPages: 3,
      perPage: 100,
    });

    const shouldForceRefresh = Boolean(force) || resolvedInstallationId === null;

    const result = await bootstrapGithubStatsFromEvents({
      username: resolvedUsername,
      installationId: resolvedInstallationId,
      events,
      force: shouldForceRefresh,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: Number(result?.status) || 400 });
    }

    return NextResponse.json({
      ok: true,
      github_username: resolvedUsername,
      installation_id: resolvedInstallationId,
      events_fetched: events.length,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Failed to bootstrap GitHub stats",
      },
      { status: 500 }
    );
  }
}