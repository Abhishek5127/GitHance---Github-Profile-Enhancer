import { NextResponse } from "next/server";
import { bootstrapGithubStatsFromEvents } from "@/app/lib/githubStats";

const GITHUB_API = "https://api.github.com";

function toHeaders(token = "") {
  const headers = {
    Accept: "application/vnd.github+json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchJson(url, token = "") {
  const response = await fetch(url, {
    headers: toHeaders(token),
  });

  const body = await response.text();
  let data = null;

  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = null;
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      data,
    };
  }

  return {
    ok: true,
    status: response.status,
    data,
  };
}

async function resolveUsername({ username, token }) {
  const cleanedUsername = String(username || "")
    .trim()
    .toLowerCase();
  if (cleanedUsername) return cleanedUsername;

  if (!token) return "";

  const me = await fetchJson(`${GITHUB_API}/user`, token);
  if (!me.ok) return "";

  return String(me.data?.login || "")
    .trim()
    .toLowerCase();
}

function dedupeEvents(events = []) {
  const seen = new Set();
  const list = [];

  events.forEach((event) => {
    const eventId = String(event?.id || "").trim();
    if (!eventId || seen.has(eventId)) return;
    seen.add(eventId);
    list.push(event);
  });

  return list;
}

async function fetchRecentEvents({ username, token }) {
  const urls = token
    ? [
        `${GITHUB_API}/users/${username}/events?per_page=100`,
        `${GITHUB_API}/users/${username}/events/public?per_page=100`,
      ]
    : [`${GITHUB_API}/users/${username}/events/public?per_page=100`];

  const results = await Promise.all(urls.map((url) => fetchJson(url, token)));
  const merged = results
    .filter((result) => result.ok && Array.isArray(result.data))
    .flatMap((result) => result.data);

  return dedupeEvents(merged);
}

export async function POST(req) {
  try {
    const {
      username = "",
      token = "",
      installationId = null,
      force = false,
    } = await req.json();

    const resolvedUsername = await resolveUsername({
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

    const events = await fetchRecentEvents({
      username: resolvedUsername,
      token,
    });

    const result = await bootstrapGithubStatsFromEvents({
      username: resolvedUsername,
      installationId,
      events,
      force: Boolean(force),
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: Number(result?.status) || 400 });
    }

    return NextResponse.json({
      ok: true,
      github_username: resolvedUsername,
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
