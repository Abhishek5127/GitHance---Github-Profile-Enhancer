import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { createInitialRepoSections } from "@/app/lib/repoBuilder/core";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.1-8b-instruct";

function jsonError(status, error, details = undefined) {
  return NextResponse.json(
    {
      ok: false,
      error,
      ...(details ? { details } : {}),
    },
    { status }
  );
}

function normalizeSectionIds(sections = []) {
  const values = (Array.isArray(sections) ? sections : [])
    .filter((entry) => entry && typeof entry === "object")
    .filter((entry) => entry.enabled !== false)
    .map((entry) => String(entry.id || "").trim().toLowerCase())
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  values.forEach((value) => {
    if (seen.has(value)) return;
    seen.add(value);
    deduped.push(value);
  });

  return deduped;
}

function summarizeContext(context = {}) {
  const repository = context?.repository || {};
  const insights = context?.insights || {};
  const architecture = insights?.architecture || {};
  const libraries = insights?.libraries || {};
  const runtime = insights?.runtime || {};
  const howItWorks = insights?.how_it_works || {};
  const liveStatus = insights?.live_status || {};
  const classification = insights?.classification || {};

  return {
    repository: {
      owner: repository?.owner || "",
      name: repository?.name || "",
      full_name: repository?.full_name || "",
      description: repository?.description || "",
      language: repository?.language || "",
      topics: Array.isArray(repository?.topics) ? repository.topics.slice(0, 16) : [],
      license: repository?.license || "",
      default_branch: repository?.default_branch || "",
      visibility: repository?.visibility || "",
      stars: Number(repository?.stargazers_count || 0),
      forks: Number(repository?.forks_count || 0),
      homepage: repository?.homepage || "",
      html_url: repository?.html_url || "",
    },
    classification: {
      primary_languages: Array.isArray(classification?.primary_languages)
        ? classification.primary_languages.slice(0, 8)
        : [],
      build_tools: Array.isArray(classification?.build_tools)
        ? classification.build_tools.slice(0, 12)
        : [],
      package_managers: Array.isArray(classification?.package_managers)
        ? classification.package_managers.slice(0, 12)
        : [],
    },
    architecture: {
      top_level_directories: Array.isArray(architecture?.top_level_directories)
        ? architecture.top_level_directories.slice(0, 20)
        : [],
      structure_preview: Array.isArray(architecture?.structure_preview)
        ? architecture.structure_preview.slice(0, 60)
        : [],
      project_groups: Array.isArray(architecture?.project_groups)
        ? architecture.project_groups.slice(0, 20)
        : [],
      relevant_files: Array.isArray(architecture?.relevant_files)
        ? architecture.relevant_files.slice(0, 50)
        : [],
    },
    libraries: {
      frameworks: Array.isArray(libraries?.frameworks) ? libraries.frameworks.slice(0, 20) : [],
      detected: Array.isArray(libraries?.detected) ? libraries.detected.slice(0, 80) : [],
      manifests: Array.isArray(libraries?.manifests) ? libraries.manifests.slice(0, 20) : [],
    },
    runtime: {
      scripts: Array.isArray(runtime?.scripts) ? runtime.scripts.slice(0, 24) : [],
      api_paths: Array.isArray(runtime?.api_paths) ? runtime.api_paths.slice(0, 20) : [],
    },
    how_it_works: {
      hints: Array.isArray(howItWorks?.hints) ? howItWorks.hints.slice(0, 12) : [],
    },
    live_status: {
      status_label: liveStatus?.status_label || "",
      live_url: liveStatus?.live_url || "",
      docs_url: liveStatus?.docs_url || "",
    },
  };
}

function buildSystemPrompt() {
  return [
    "You are a senior technical writer producing high-signal README markdown.",
    "Generate concise, accurate section content from provided repository context.",
    "Do not invent features, APIs, architecture, or dependencies.",
    "If data is missing, write safe placeholders without hallucinations.",
    "Return JSON object only, no markdown fences, no explanations.",
  ].join(" ");
}

function buildUserPrompt({ sectionIds = [], style = "comprehensive", context = {} }) {
  return `
Target sections (only these keys):
${sectionIds.map((id) => `- ${id}`).join("\n")}

Style preset: ${String(style || "comprehensive")}

Requirements:
- Output valid JSON object where each key is a section id from the target list.
- Value for each key must be markdown content (without section heading).
- Prefer bullets and code blocks where appropriate.
- Keep each section practical and implementation-focused.
- Do not include surrounding commentary or non-JSON text.

Repository context:
${JSON.stringify(context, null, 2)}
`;
}

function extractFirstJsonObject(rawValue = "") {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Continue to best-effort extraction.
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function sanitizeAiSectionMap(payload, allowedSectionIds = []) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }

  const allowed = new Set(allowedSectionIds);
  const out = {};

  Object.entries(payload).forEach(([key, value]) => {
    const normalizedKey = String(key || "").trim().toLowerCase();
    if (!allowed.has(normalizedKey)) return;

    const text = String(value || "")
      .replace(/```(?:json)?/gi, "")
      .trim();
    if (!text) return;

    out[normalizedKey] = text;
  });

  return out;
}

function buildFallbackSections(context = {}, sectionIds = []) {
  const defaults = createInitialRepoSections(context);
  const idSet = new Set(sectionIds);

  const out = {};
  defaults.forEach((entry) => {
    const normalizedId = String(entry?.id || "").trim().toLowerCase();
    if (!idSet.has(normalizedId)) return;
    const content = String(entry?.content || "").trim();
    if (!content) return;
    out[normalizedId] = content;
  });

  return out;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return jsonError(401, "Authentication required");
    }

    const body = await req.json().catch(() => ({}));
    const context = body?.context && typeof body.context === "object" ? body.context : null;
    const sectionIds = normalizeSectionIds(body?.sections);
    const style = String(body?.style || "comprehensive").trim().toLowerCase();

    if (!context) {
      return jsonError(400, "context is required");
    }
    if (!sectionIds.length) {
      return jsonError(400, "At least one section is required");
    }

    const summarizedContext = summarizeContext(context);
    const fallbackSections = buildFallbackSections(context, sectionIds);
    const apiKey = String(process.env.OPENROUTER_API_KEY || "").trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          ok: true,
          source: "fallback",
          model: "",
          sections: fallbackSections,
        },
        { status: 200 }
      );
    }

    const response = await fetch(OPENROUTER_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000",
        "X-Title": "GitHance Repo README Builder",
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        temperature: 0.25,
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(),
          },
          {
            role: "user",
            content: buildUserPrompt({
              sectionIds,
              style,
              context: summarizedContext,
            }),
          },
        ],
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        {
          ok: true,
          source: "fallback",
          model: "",
          sections: fallbackSections,
          warning:
            payload?.error?.message || payload?.message || "AI request failed, fallback used",
        },
        { status: 200 }
      );
    }

    const rawCompletion =
      payload?.choices?.[0]?.message?.content || payload?.choices?.[0]?.text || "";
    const extracted = extractFirstJsonObject(rawCompletion);
    const aiSections = sanitizeAiSectionMap(extracted, sectionIds);

    return NextResponse.json(
      {
        ok: true,
        source: Object.keys(aiSections).length ? "ai" : "fallback",
        model: String(payload?.model || DEFAULT_MODEL),
        sections: Object.keys(aiSections).length ? aiSections : fallbackSections,
      },
      { status: 200 }
    );
  } catch (error) {
    return jsonError(500, error?.message || "Failed to generate README sections");
  }
}

