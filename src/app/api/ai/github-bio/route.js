import { NextResponse } from "next/server";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ||
  "meta-llama/llama-3.1-8b-instruct";
const GENERATION_RULES = [
  "Write exactly 2 to 4 lines.",
  "Mention main languages/stack only when detectable from data.",
  "Mention project types/domains only when detectable from data.",
  "Mention deployment only if deployed_projects contains values.",
  "Use factual statements only from the provided JSON.",
  "No emojis.",
  "No exaggeration or hype wording.",
  "Natural GitHub profile style.",
];

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function removeEmojis(value) {
  return String(value || "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\p{Emoji_Presentation}/gu, "");
}

function sanitizeBio(value) {
  const clean = removeEmojis(String(value || ""))
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^["']|["']$/g, "");

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4);

  return lines.join("\n").trim();
}

function validatePayload(payload) {
  if (!isObject(payload)) return "Invalid payload";
  if (!isObject(payload.profile)) return "Missing profile object";
  if (!Array.isArray(payload.repos)) return "Missing repos array";
  if (!isObject(payload.stats)) return "Missing stats object";
  return null;
}

export async function POST(req) {
  try {
    const payload = await req.json();
    const validationError = validatePayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "GitHance",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.3,
        max_tokens: 180,
        messages: [
          {
            role: "system",
            content:
              "You write concise GitHub profile bios from structured repository data. Return plain text only.",
          },
          {
            role: "user",
            content: `Generate a GitHub bio using these rules:\n- ${GENERATION_RULES.join(
              "\n- "
            )}\n\nInput JSON:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: result?.error?.message || "AI request failed" },
        { status: 502 }
      );
    }

    const rawBio = result?.choices?.[0]?.message?.content;
    const bio = sanitizeBio(rawBio);
    if (!bio) {
      return NextResponse.json({ error: "AI returned empty bio" }, { status: 502 });
    }

    return NextResponse.json({ bio });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate bio" },
      { status: 500 }
    );
  }
}
