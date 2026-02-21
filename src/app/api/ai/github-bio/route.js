import { NextResponse } from "next/server";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ||
  "meta-llama/llama-3.1-8b-instruct";
const GENERATION_RULES = [
  "Output 2–3 short lines only (max 160 characters per line).",
  "Line 1: developer role + main stack/languages.",
  "Line 2: project types or domains inferred from repos.",
  "Line 3 (optional): deployment or focus area if detectable.",
  "Use concrete technologies (e.g., MERN, JavaScript, Node.js) when present.",
  "Use only facts derivable from JSON.",
  "No generic phrases (passionate, dedicated, motivated, enthusiastic).",
  "No buzzwords (cutting-edge, innovative, dynamic).",
  "No emojis.",
  "No hashtags.",
  "No first-person pronouns.",
  "GitHub bio style: concise, factual, builder-oriented.",
];

const SYSTEM_PROMPT = `
You are a technical recruiter writing GitHub bios.

Goal: produce strong, concise GitHub profile bios from repository data.

Style requirements:
- extremely concise
- factual
- technical
- no fluff
- no marketing language
- no personality traits
- no claims not supported by data

Output format:
2–3 short lines.
Each line ≤160 characters.
No extra text.
No labels.
No explanations.

Bad words to avoid:
passionate, dedicated, enthusiastic, motivated, skilled, experienced, innovative, dynamic.

Prefer concrete stack and project terms:
MERN, JavaScript, Node.js, React, AI tools, authentication systems, web apps, APIs, SaaS, full-stack.

If data is weak, keep bio minimal and factual.
Return text only.
`;

const userPrompt = `
Generate GitHub bio following rules:
- ${GENERATION_RULES.join("\n- ")}

Infer from data:
- main languages from stats.top_languages
- stack from stats.primary_stack
- domains from stats.domains
- deployment if stats.deployed_projects not empty
- activity from stats.recent_activity

Input JSON:
${JSON.stringify(payload, null, 2)}

Bio:
`;

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
            content: SYSTEM_PROMPT
          },
          {
            role: "user",
            role: "user",
            content: userPrompt,
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
