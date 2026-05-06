import { NextResponse } from "next/server";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openrouter/free";
const BIO_LINE_LIMIT = 4;
const AI_BIO_MAX_TOKENS = 260;

function getModelCandidates() {
  const configuredModel = String(process.env.OPENROUTER_MODEL || "").trim();
  const fallbackModels = String(
    process.env.OPENROUTER_FALLBACK_MODELS || DEFAULT_MODEL
  )
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return [...new Set([configuredModel || DEFAULT_MODEL, ...fallbackModels])];
}

function shouldTryNextModel(response, message) {
  return (
    response.status === 404 ||
    response.status === 429 ||
    response.status >= 500 ||
    /no endpoints|not available|unavailable|overloaded|rate.?limit|timeout|temporarily/i.test(
      String(message || "")
    )
  );
}

/**
 * Smart professional bio rules
 */
const GENERATION_RULES = [
  "Write 3-4 concise professional GitHub bio lines.",
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
- 3-4 lines only
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
    .slice(0, BIO_LINE_LIMIT);

  return lines.join("\n");
}

function toText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).filter(Boolean).join("\n");
  }
  if (!isObject(value)) return "";

  return toText(value.text ?? value.content ?? value.value ?? "");
}

function extractGeneratedText(result) {
  const choice = result?.choices?.[0] || {};
  const message = choice?.message || {};

  return (
    [
      message.content,
      message.text,
      choice.text,
      result?.output_text,
    ]
      .map((value) => toText(value).trim())
      .find(Boolean) || ""
  );
}

function compactTextList(value, limit = 4) {
  const list = Array.isArray(value) ? value : [];
  return list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit);
}

function formatList(items) {
  if (!items.length) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function inferFallbackRole(stats = {}) {
  const stack = compactTextList(stats.primary_stack || stats.top_languages, 8)
    .join(" ")
    .toLowerCase();
  const domains = compactTextList(stats.domains, 8).join(" ").toLowerCase();

  if (/react|next|node|express|api/.test(stack)) return "Full-stack developer";
  if (/react|next|frontend|ui/.test(stack)) return "Frontend developer";
  if (/node|express|api|backend/.test(stack)) return "Backend developer";
  if (/ai|ml|llm/.test(domains)) return "AI product builder";
  if (/data|analytics|pipeline/.test(domains)) return "Data-focused developer";
  return "Software developer";
}

function addFallbackLine(lines, value) {
  const line = String(value || "").replace(/\s+/g, " ").trim();
  if (!line || lines.includes(line)) return;
  lines.push(line.slice(0, 200));
}

function buildFallbackBio(payload) {
  const profile = payload?.profile || {};
  const stats = payload?.stats || {};
  const repos = Array.isArray(payload?.repos) ? payload.repos : [];
  const role = inferFallbackRole(stats);
  const stack = compactTextList(stats.primary_stack || stats.top_languages);
  const domains = compactTextList(stats.domains, 3);
  const deployedProjects = compactTextList(stats.deployed_projects, 2);
  const repoNames = compactTextList(
    repos.map((repo) => repo?.name),
    3
  );
  const focus = formatList(domains.length ? domains : ["software products"]);
  const stackText = formatList(stack);

  const lines = [];
  addFallbackLine(lines, `${role} focused on ${focus}.`);

  if (stackText) {
    addFallbackLine(lines, `Works with ${stackText} across practical GitHub projects.`);
  }

  if (repoNames.length) {
    addFallbackLine(lines, `Builds projects such as ${formatList(repoNames)} with a product-minded engineering style.`);
  }

  if (deployedProjects.length) {
    addFallbackLine(lines, `Ships deployed work including ${formatList(deployedProjects)}.`);
  }

  if (lines.length < 3) {
    const repoCount = Number(profile.public_repos || repos.length || 0);
    addFallbackLine(
      lines,
      repoCount
        ? `Maintains ${repoCount} public repositories with attention to clear, reusable implementation.`
        : "Turns repository ideas into useful developer-facing software."
    );
  }

  if (lines.length < 3) {
    addFallbackLine(lines, "Keeps profile work grounded in real repositories and maintainable delivery.");
  }

  return sanitizeBio(lines.join("\n"));
}

function validatePayload(payload) {
  if (!isObject(payload)) return "Invalid payload";
  if (!isObject(payload.profile)) return "Missing profile object";
  if (!Array.isArray(payload.repos)) return "Missing repos array";
  if (!isObject(payload.stats)) return "Missing stats object";
  return null;
}

async function requestBioCompletion({ apiKey, userPrompt }) {
  const models = getModelCandidates();
  let lastError = "AI request failed";

  for (const model of models) {
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
        model,
        temperature: 0.25,
        max_tokens: AI_BIO_MAX_TOKENS,
        stop: ["Explanation:", "Analysis:"],
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

    const result = await response.json().catch(() => null);
    if (response.ok) {
      if (!sanitizeBio(extractGeneratedText(result)) && model !== models[models.length - 1]) {
        lastError = "AI returned empty bio";
        continue;
      }

      return result;
    }

    lastError = result?.error?.message || result?.message || lastError;
    if (!shouldTryNextModel(response, lastError)) break;
  }

  const error = new Error(lastError);
  error.status = 502;
  throw error;
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

    const result = await requestBioCompletion({
      apiKey,
      userPrompt,
    });

    const rawBio = extractGeneratedText(result);
    const bio = sanitizeBio(rawBio) || buildFallbackBio(trimmedPayload);

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
      { status: error?.status || 500 }
    );
  }
}
