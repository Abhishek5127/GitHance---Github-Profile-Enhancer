"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AnalyticsShell from "@/app/components/analytics/AnalyticsShell";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import Unauthorized from "@/app/statusCodePages/unauthorized";
import ReadmeBlock from "../readme-analyze-components/ReadmeBlock";
import { analyzeReadme, README_SECTION_DEFINITIONS } from "@/app/lib/readme/analyzeReadme";

const DEFAULT_SECTIONS = README_SECTION_DEFINITIONS.reduce((result, section) => {
  result[section.key] = section.key === "roadmap" ? false : true;
  return result;
}, {});

const DEFAULT_OPTIONS = {
  title: "",
  tone: "developer-friendly",
  targetAudience: "",
  customNotes: "",
  sections: DEFAULT_SECTIONS,
};

const TONE_OPTIONS = [
  { value: "developer-friendly", label: "Developer Friendly" },
  { value: "technical", label: "Technical" },
  { value: "product-polished", label: "Product Polished" },
  { value: "concise", label: "Concise" },
];

function buildNavSections(reponame) {
  return [
    {
      label: "README Lab",
      items: [
        { id: "overview", label: "Overview", href: "#overview" },
        { id: "insights", label: "Insights", href: "#insights" },
        { id: "builder", label: "Builder", href: "#builder" },
        { id: "editor", label: "Editor", href: "#editor" },
        { id: "preview", label: "Preview", href: "#preview" },
        {
          id: "security",
          label: "Security View",
          href: `/repository-security/${encodeURIComponent(reponame || "")}`,
        },
      ],
    },
  ];
}

function buildInitialOptions(data, currentReadme) {
  const analysis = analyzeReadme(currentReadme, {
    repoName: data?.repository?.name,
    repoDescription: data?.repository?.description,
  });
  const licenseDetected =
    Boolean(data?.repository?.license?.name) ||
    analysis.sectionCoverage.some((section) => section.key === "license" && section.found);

  return {
    ...DEFAULT_OPTIONS,
    title: analysis.title || data?.repository?.name || "",
    targetAudience: data?.repository?.private
      ? "Internal collaborators and maintainers"
      : "Open-source contributors and developers",
    sections: {
      ...DEFAULT_SECTIONS,
      license: licenseDetected,
    },
  };
}

function MetricCard({ label, value, hint = "" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
      {hint ? <p className="mt-2 text-xs text-white/55">{hint}</p> : null}
    </div>
  );
}

function StatusBadge({ active, activeLabel, inactiveLabel }) {
  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${
        active
          ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
          : "border-amber-400/30 bg-amber-500/10 text-amber-100"
      }`}
    >
      {active ? activeLabel : inactiveLabel}
    </span>
  );
}

function FeedbackBanner({ feedback }) {
  if (!feedback?.message) return null;

  const toneClass =
    feedback.tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : feedback.tone === "success"
        ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
        : "border-cyan-400/30 bg-cyan-500/10 text-cyan-100";

  return <div className={`rounded-2xl border px-4 py-3 text-sm ${toneClass}`}>{feedback.message}</div>;
}

function InsightPanel({ title, items, emptyText, tone = "default" }) {
  const toneClass =
    tone === "warn"
      ? "border-amber-400/20 bg-amber-500/5"
      : tone === "good"
        ? "border-emerald-400/20 bg-emerald-500/5"
        : "border-white/10 bg-white/5";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">{title}</p>
      <div className="mt-3 space-y-2 text-sm text-white/80">
        {items.length > 0 ? (
          items.map((item) => (
            <p key={item} className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
              {item}
            </p>
          ))
        ) : (
          <p className="text-white/55">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function SectionCoverageCard({ sectionCoverage = [] }) {
  const safeCoverage = Array.isArray(sectionCoverage) ? sectionCoverage : [];
  const totalSections = safeCoverage.length || 1;
  const coveredSections = safeCoverage.filter((section) => section.found).length;
  const coveragePercent = Math.round((coveredSections / totalSections) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-white/45">Section Coverage</p>
      <h3 className="mt-1 text-xl font-semibold text-white">
        {coveredSections}/{safeCoverage.length || 0} sections detected
      </h3>
      <p className="mt-2 text-sm text-white/70">
        GitHance checks your markdown structure and highlights gaps before you publish.
      </p>

      <div className="mt-4 h-2.5 overflow-hidden rounded-full border border-white/10 bg-black/20">
        <div
          className="h-full rounded-full bg-cyan-400 transition-all"
          style={{ width: `${coveragePercent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-white/55">{coveragePercent}% of recommended sections are currently present.</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {safeCoverage.map((section) => (
          <span
            key={section.key}
            className={`rounded-full border px-2.5 py-1 text-xs ${
              section.found
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                : "border-amber-400/30 bg-amber-500/10 text-amber-100"
            }`}
          >
            {section.label}
          </span>
        ))}
      </div>
    </section>
  );
}

function BuilderControls({ options, onChange, isGenerating, onGenerate, generateLabel }) {
  const toggleSection = (key) => {
    onChange({
      ...options,
      sections: {
        ...options.sections,
        [key]: !options.sections[key],
      },
    });
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Step 1: Configure</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Guide the README before generation</h3>
          <p className="mt-1 text-sm text-white/70">
            Set tone and sections first, then generate a draft that matches your intent.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={isGenerating}
          className="rounded-xl bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isGenerating ? "Working..." : generateLabel}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-white/75">README title</span>
          <input
            value={options.title}
            onChange={(event) => onChange({ ...options, title: event.target.value })}
            placeholder="Project title"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
        </label>

        <label className="space-y-2">
          <span className="text-sm text-white/75">Tone</span>
          <select
            value={options.tone}
            onChange={(event) => onChange({ ...options, tone: event.target.value })}
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          >
            {TONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm text-white/75">Target audience</span>
          <input
            value={options.targetAudience}
            onChange={(event) => onChange({ ...options, targetAudience: event.target.value })}
            placeholder="Who should this README speak to?"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
        </label>

        <label className="space-y-2 md:col-span-1">
          <span className="text-sm text-white/75">Custom notes for GitHance</span>
          <textarea
            value={options.customNotes}
            onChange={(event) => onChange({ ...options, customNotes: event.target.value })}
            placeholder="Examples: emphasize setup simplicity, keep roadmap short, mention deployment, add contributor guidance"
            className="min-h-[112px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
      </div>

      <div className="mt-5">
        <p className="text-sm text-white/75">Sections to include (core sections are marked with *)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {README_SECTION_DEFINITIONS.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => toggleSection(section.key)}
              aria-pressed={Boolean(options.sections[section.key])}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                options.sections[section.key]
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
                  : "border-white/10 bg-black/20 text-white/55"
              }`}
            >
              {section.label}
              {section.required ? " *" : ""}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorPane({
  value,
  onChange,
  onReset,
  onCopy,
  onPublish,
  isPublishing,
  canReset,
  canCopy,
  canPublish,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Step 2: Edit Markdown</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Refine the draft before publishing</h3>
          <p className="mt-1 text-sm text-white/70">
            Make final wording changes here. You can safely copy, reset, or publish anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/75 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to GitHub README
          </button>
          <button
            type="button"
            onClick={onCopy}
            disabled={!canCopy}
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/75 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy Markdown
          </button>
          <button
            type="button"
            onClick={onPublish}
            disabled={!canPublish || isPublishing}
            className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPublishing ? "Publishing..." : "Publish to GitHub"}
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Generate a README with GitHance or start writing here."
        className="mt-4 min-h-[640px] w-full rounded-2xl border border-white/10 bg-[#0c1016] p-4 font-mono text-sm text-white outline-none"
      />
    </div>
  );
}

function PreviewPane({ value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Step 3: Preview</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Rendered markdown</h3>
        </div>
      </div>

      <div className="mt-4 min-h-[640px] overflow-auto rounded-2xl border border-white/10 bg-[#0c1016] p-4">
        {value.trim() ? (
          <ReadmeRenderer readme={value} className="text-white" />
        ) : (
          <div className="flex min-h-[600px] items-center justify-center text-sm text-white/45">
            README preview appears here once content exists.
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReadmeClient({ reponame }) {
  const { data: session, status } = useSession();
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceData, setWorkspaceData] = useState(null);
  const [originalReadme, setOriginalReadme] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [feedback, setFeedback] = useState({ tone: "info", message: "" });

  useEffect(() => {
    if (status !== "authenticated" || !session?.username || !reponame) {
      return;
    }

    let isCancelled = false;

    const loadWorkspace = async () => {
      try {
        setWorkspaceLoading(true);
        setWorkspaceError("");
        setFeedback({ tone: "info", message: "" });

        const response = await fetch("/api/repository-readme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: session.username, repo: reponame }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load README workspace");
        }

        if (isCancelled) return;

        const nextReadme = String(payload?.readme?.content || "");
        setWorkspaceData(payload);
        setOriginalReadme(nextReadme);
        setEditorValue(nextReadme);
        setOptions(buildInitialOptions(payload, nextReadme));
      } catch (error) {
        if (isCancelled) return;
        setWorkspaceError(error?.message || "Failed to load README workspace");
      } finally {
        if (!isCancelled) {
          setWorkspaceLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      isCancelled = true;
    };
  }, [status, session?.username, reponame]);

  const readmeExists = Boolean(workspaceData?.readme?.exists);
  const hasEditorContent = Boolean(editorValue.trim());
  const generationMode = readmeExists || hasEditorContent ? "improve" : "create";
  const generateLabel = generationMode === "create" ? "Build with GitHance" : "Refine with GitHance";

  const analysis = useMemo(
    () =>
      analyzeReadme(editorValue, {
        repoName: workspaceData?.repository?.name,
        repoDescription: workspaceData?.repository?.description,
      }),
    [editorValue, workspaceData?.repository?.name, workspaceData?.repository?.description]
  );

  const coveredSections = analysis.sectionCoverage.filter((section) => section.found).length;
  const totalSections = analysis.sectionCoverage.length || README_SECTION_DEFINITIONS.length;
  const repositoryTreePreview =
    workspaceData?.relevantFiles?.length > 0
      ? workspaceData.relevantFiles
      : Array.isArray(workspaceData?.tree)
        ? workspaceData.tree.slice(0, 80)
        : [];

  const user = session?.username
    ? { name: session.username, subtitle: reponame ? `Repo: ${reponame}` : "" }
    : null;

  const handleGenerate = async () => {
    if (!session?.username || !reponame) return;

    try {
      setIsGenerating(true);
      setFeedback({ tone: "info", message: "" });

      const response = await fetch("/api/ai/repo-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: session.username,
          repo: reponame,
          mode: generationMode,
          currentReadme: editorValue,
          options,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || typeof payload?.readme !== "string") {
        throw new Error(payload?.error || "Failed to generate README");
      }

      setEditorValue(payload.readme);
      setFeedback({
        tone: "success",
        message:
          generationMode === "create"
            ? "GitHance built a fresh README draft from the repository context."
            : "GitHance refreshed the README using the current repository context and your edits.",
      });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error?.message || "Failed to generate README",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!editorValue.trim()) return;

    try {
      await navigator.clipboard.writeText(editorValue);
      setFeedback({ tone: "success", message: "README markdown copied to your clipboard." });
    } catch {
      setFeedback({ tone: "error", message: "Clipboard copy failed in this browser." });
    }
  };

  const handleReset = () => {
    setEditorValue(originalReadme || "");
    setFeedback({ tone: "info", message: "Editor reset to the repository's current README state." });
  };

  const handlePublish = async () => {
    if (!session?.username || !editorValue.trim()) return;

    try {
      setIsPublishing(true);
      setFeedback({ tone: "info", message: "" });

      const response = await fetch("/api/publish-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: session.username,
          repo: reponame,
          readmeContent: editorValue,
          readmeMessage: readmeExists
            ? "Update README via GitHance README Lab"
            : "Create README via GitHance README Lab",
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to publish README");
      }

      setOriginalReadme(editorValue);
      setWorkspaceData((current) =>
        current
          ? {
              ...current,
              readme: {
                ...(current.readme || {}),
                exists: true,
                content: editorValue,
                path: current?.readme?.path || "README.md",
              },
            }
          : current
      );
      setFeedback({ tone: "success", message: "README published to GitHub successfully." });
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error?.message || "Failed to publish README",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (status === "loading" || workspaceLoading) {
    return (
      <AnalyticsShell
        context="README"
        title={reponame || "README Lab"}
        subtitle="Inspecting repository structure, reading README content, and preparing the editor workspace."
        navSections={buildNavSections(reponame)}
        activeNavId="overview"
        user={user}
      >
        <div className="grid gap-6">
          <section id="overview" className="analytics-card p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/45">README Workspace</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Preparing your analysis and editing tools</h2>
            <p className="mt-2 max-w-3xl text-sm text-white/70">
              Loading repository metadata, current README content, and file structure for better suggestions.
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="README Score" value="--" hint="Waiting for analysis" />
            <MetricCard label="Sections" value="--" />
            <MetricCard label="Words" value="--" />
            <MetricCard label="Code Blocks" value="--" />
          </div>

          <ReadmeBlock loading />
        </div>
      </AnalyticsShell>
    );
  }

  if (status !== "authenticated") {
    return <Unauthorized />;
  }

  return (
    <AnalyticsShell
      context="README"
      title={reponame || "README Lab"}
      subtitle="Analyze the repository README, generate missing content with GitHance, and refine markdown before publishing."
      navSections={buildNavSections(reponame)}
      activeNavId="overview"
      user={user}
    >
      <div className="grid gap-6">
        <section id="overview" className="analytics-card p-5">
          

          <div className="mt-5 flex flex-wrap gap-2">
            <a
              href="#insights"
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              1. Review Insights
            </a>
            <a
              href="#builder"
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              2. Configure Generation
            </a>
            <a
              href="#editor"
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              3. Edit Markdown
            </a>
            <a
              href="#preview"
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              4. Preview + Publish
            </a>
            <a
              href={`/repository-security/${encodeURIComponent(reponame || "")}`}
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              Open Security View
            </a>
          </div>
        </section>

        {workspaceError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">{workspaceError}</div>
        ) : null}

        <FeedbackBanner feedback={feedback} />

        {!workspaceError && workspaceData ? (
          <>

            <section id="builder" className="grid gap-4">
              <BuilderControls
                options={options}
                onChange={setOptions}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
                generateLabel={generateLabel}
              />
            </section>

            <section id="editor" className="grid gap-4 xl:grid-cols-2">
              <EditorPane
                value={editorValue}
                onChange={setEditorValue}
                onReset={handleReset}
                onCopy={handleCopy}
                onPublish={handlePublish}
                isPublishing={isPublishing}
                canReset={editorValue !== originalReadme}
                canCopy={Boolean(editorValue.trim())}
                canPublish={Boolean(editorValue.trim())}
              />
              <div id="preview">
                <PreviewPane value={editorValue} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </AnalyticsShell>
  );
}

