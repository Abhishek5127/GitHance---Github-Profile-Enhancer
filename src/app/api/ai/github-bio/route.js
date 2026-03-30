import { log } from "console";
import { NextResponse } from "next/server";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const DEFAULT_MODEL =
  process.env.OPENROUTER_MODEL ||
  "meta-llama/llama-3.1-8b-instruct";

/**
 * Smart professional bio rules
 */
const GENERATION_RULES = [
  "Write 14-15 concise professional GitHub bio lines.",
  "Infer developer role from languages and stack (JS+React → web/full-stack).",
  "Infer domains from repo names/descriptions (auth → security, resume → AI/productivity).",
  "Infer problems solved from project purpose when possible.",
  "Mention stack using concrete technologies (JavaScript, MERN, Node.js, React).",
  "Mention deployment if deployed_projects exist.",
  "Professional tone: senior, product-focused, builder mindset.",
  "No emojis.",
  "No hashtags.",
  "No first-person pronouns.",
  "No generic fluff (passionate, dedicated, enthusiastic).",
  "Do not explain reasoning.",
  "Return only the bio.",
];

/**
 * System prompt: predictive professional summary mode
 */
const SYSTEM_PROMPT = `
You are an expert technical recruiter and developer portfolio writer.

Goal:
Generate strong professional GitHub bios from repository metadata.

You MUST infer and predict from weak signals:
- languages → developer role
- stack → specialization
- repo names → domains
- project types → problems solved
- deployment → production experience

Examples of inference:
JS + React → web or full-stack developer
Auth repo → authentication/security systems
AI repo → AI tools or automation
Resume builder → productivity tools
College/Syllabus → education platforms

BIO STYLE:
- senior professional tone
- product and impact oriented
- concise GitHub profile style
- confident but realistic

OUTPUT RULES:
- 14-15 lines only
- ≤200 characters per line
- no explanations
- no reasoning
- no analysis text
- no prefixes
- no markdown
- no quotes

Return ONLY the bio text.
`;

/**
 * Helpers
 */
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
    .replace(/^["']|["']$/g, "")
    .replace(/^bio:\s*/i, "")
    .replace(/^final bio:\s*/i, "")
    .trim();

  const lines = clean
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 3);

  return lines.join("\n");
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

    // Trim repos to avoid token overflow
    const trimmedPayload = {
      ...payload,
      repos: payload.repos.slice(0, 50),
    };

    const userPrompt = `
Generate GitHub bio.

Rules:
- ${GENERATION_RULES.join("\n- ")}

Data:
${JSON.stringify(trimmedPayload)}

FINAL BIO:
`;

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
        temperature: 0.25,
        max_tokens: 120,
        stop: ["\n\n", "Explanation:", "Analysis:"],
        messages: [
          {
            role: "system",
            content: SYSTEM_PROMPT,
          },
          {
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

    const rawBio =
      result?.choices?.[0]?.message?.content ||
      result?.choices?.[0]?.text ||
      "";      

    const bio = sanitizeBio(rawBio);

    if (!bio) {
      return NextResponse.json(
        { error: "AI returned empty bio" },
        { status: 502 }
      );
    }

    return NextResponse.json({ bio });
  } catch (error) {
    return NextResponse.json(
      { error: error?.message || "Failed to generate bio" },
      { status: 500 }
    );
  }
}