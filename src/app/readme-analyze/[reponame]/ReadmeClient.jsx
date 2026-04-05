"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AnalyticsShell from "@/app/components/analytics/AnalyticsShell";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import {
  analyzeReadme,
  README_SECTION_DEFINITIONS,
} from "@/app/lib/readme/analyzeReadme";
import { saveReadmePreviewPayload } from "@/app/lib/readmePreview";

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

function buildNavSections(reponame, owner) {
  const encodedRepo = encodeURIComponent(reponame || "");
  const ownerQuery = owner ? `?owner=${encodeURIComponent(owner)}` : "";

  return [
    {
      label: "README Lab",
      items: [
        { id: "overview", label: "Overview", href: "#overview" },
        { id: "builder", label: "Builder", href: "#builder" },
        { id: "editor", label: "Editor", href: "#editor" },
        { id: "preview", label: "Preview", href: "#preview" },
        {
          id: "security",
          label: "Security View",
          href: `/repository-security/${encodedRepo}${ownerQuery}`,
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

function BuilderControls({ options, onChange, isGenerating, onGenerate }) {
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
          {isGenerating ? "Working..." : "Generate README"}
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
            placeholder="Mention setup simplicity, deployment notes, contributor guidance, or anything else to emphasize."
            className="min-h-[112px] w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
        </label>
      </div>

      <div className="mt-5">
        <p className="text-sm text-white/75">Sections to include</p>
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
  onPreview,
  isOpeningPreview,
  canReset,
  canCopy,
  canPreview,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Step 2: Edit Markdown</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Refine the draft before preview</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onReset}
            disabled={!canReset}
            className="rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white/75 transition hover:bg-black/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset
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
            onClick={onPreview}
            disabled={!canPreview || isOpeningPreview}
            className="rounded-xl bg-cyan-300 px-3 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isOpeningPreview ? "Opening..." : "Open Full Preview"}
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
          <h3 className="mt-1 text-xl font-semibold text-white">Inline markdown preview</h3>
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
  const searchParams = useSearchParams();
  const owner = useMemo(
    () => String(searchParams.get("owner") || "").trim().toLowerCase(),
    [searchParams]
  );
  const previewHref = useMemo(() => {
    const repoPath = `/readme-analyze/${encodeURIComponent(reponame || "")}`;
    return owner ? `${repoPath}?owner=${encodeURIComponent(owner)}` : repoPath;
  }, [owner, reponame]);

  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");
  const [workspaceData, setWorkspaceData] = useState(null);
  const [originalReadme, setOriginalReadme] = useState("");
  const [editorValue, setEditorValue] = useState("");
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isOpeningPreview, setIsOpeningPreview] = useState(false);
  const [feedback, setFeedback] = useState({ tone: "info", message: "" });

  useEffect(() => {
    if (!owner || !reponame) return;

    let cancelled = false;

    const loadWorkspace = async () => {
      try {
        setWorkspaceLoading(true);
        setWorkspaceError("");
        setFeedback({ tone: "info", message: "" });

        const response = await fetch("/api/repository-readme", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner, repo: reponame }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Failed to load README workspace");
        }

        if (cancelled) return;

        const nextReadme = String(payload?.readme?.content || "");
        setWorkspaceData(payload);
        setOriginalReadme(nextReadme);
        setEditorValue(nextReadme);
        setOptions(buildInitialOptions(payload, nextReadme));
      } catch (error) {
        if (cancelled) return;
        setWorkspaceError(error?.message || "Failed to load README workspace");
      } finally {
        if (!cancelled) {
          setWorkspaceLoading(false);
        }
      }
    };

    loadWorkspace();

    return () => {
      cancelled = true;
    };
  }, [owner, reponame]);

  const analysis = useMemo(
    () =>
      analyzeReadme(editorValue, {
        repoName: workspaceData?.repository?.name,
        repoDescription: workspaceData?.repository?.description,
      }),
    [editorValue, workspaceData?.repository?.description, workspaceData?.repository?.name]
  );

  const handleGenerate = async () => {
    if (!owner || !reponame) return;

    try {
      setIsGenerating(true);
      setFeedback({ tone: "info", message: "" });

      const response = await fetch("/api/ai/repo-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner,
          repo: reponame,
          mode: editorValue.trim() ? "improve" : "create",
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
        message: "GitHance refreshed the README using the current repository context and your settings.",
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

  const handleOpenPreview = async () => {
    if (!owner || !editorValue.trim()) return;

    try {
      setIsOpeningPreview(true);
      setFeedback({ tone: "info", message: "" });

      saveReadmePreviewPayload({
        markdown: editorValue,
        title: workspaceData?.repository?.name || reponame || "README",
        owner,
        repo: reponame,
        source: "readme-lab",
        backHref: previewHref,
        backLabel: "Back to README Lab",
      });

      window.location.assign("/readme-preview");
    } catch (error) {
      setFeedback({
        tone: "error",
        message: error?.message || "Failed to open README preview",
      });
      setIsOpeningPreview(false);
    }
  };

  const user = owner ? { name: owner, subtitle: reponame ? `Repo: ${reponame}` : "" } : null;

  if (!owner) {
    return (
      <AnalyticsShell
        context="README"
        title={reponame || "README Lab"}
        subtitle="Open this repository from the analyzer so GitHance knows which GitHub owner to inspect."
        navSections={buildNavSections(reponame, owner)}
        activeNavId="overview"
        user={user}
      >
        <section className="analytics-card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-white/45">Repository Owner Required</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Open this README workspace from the repository analyzer.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
            GitHance needs the repository owner to load repository context. Start from the analyzer so we can pass the correct GitHub username into the README Lab.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-full bg-[#ff7a1a] px-5 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
            >
              Open repository analyzer
            </Link>
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-black/20 px-5 py-3 text-sm font-semibold text-white/80 transition hover:bg-black/30 hover:text-white"
            >
              Return home
            </Link>
          </div>
        </section>
      </AnalyticsShell>
    );
  }

  return (
    <AnalyticsShell
      context="README"
      title={reponame || "README Lab"}
      subtitle="Analyze the repository README, generate missing content with GitHance, and move into a GitHub-style preview before export."
      navSections={buildNavSections(reponame, owner)}
      activeNavId="overview"
      user={user}
    >
      <div className="grid gap-6">
        <section id="overview" className="analytics-card p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="README Score" value={analysis.score} hint="Coverage and structure score" />
            <MetricCard label="Sections" value={`${analysis.sectionCoverage.filter((section) => section.found).length}/${analysis.sectionCoverage.length}`} />
            <MetricCard label="Words" value={analysis.wordCount} />
            <MetricCard label="Code Blocks" value={analysis.codeBlockCount} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/repository-security/${encodeURIComponent(reponame || "")}?owner=${encodeURIComponent(owner)}`}
              className="rounded-xl border border-white/15 bg-black/20 px-4 py-2 text-sm text-white/75 transition hover:bg-black/30"
            >
              Open Security View
            </Link>
          </div>
        </section>

        {workspaceLoading ? (
          <div className="analytics-card p-6 text-sm text-white/70">Preparing your README workspace...</div>
        ) : null}

        {workspaceError ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">{workspaceError}</div>
        ) : null}

        <FeedbackBanner feedback={feedback} />

        {!workspaceLoading && !workspaceError && workspaceData ? (
          <>
            <section id="builder" className="grid gap-4">
              <BuilderControls
                options={options}
                onChange={setOptions}
                isGenerating={isGenerating}
                onGenerate={handleGenerate}
              />
            </section>

            <section id="editor" className="grid gap-4 xl:grid-cols-2">
              <EditorPane
                value={editorValue}
                onChange={setEditorValue}
                onReset={handleReset}
                onCopy={handleCopy}
                onPreview={handleOpenPreview}
                isOpeningPreview={isOpeningPreview}
                canReset={editorValue !== originalReadme}
                canCopy={Boolean(editorValue.trim())}
                canPreview={Boolean(editorValue.trim())}
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
