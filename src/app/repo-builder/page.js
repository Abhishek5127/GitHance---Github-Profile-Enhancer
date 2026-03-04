"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import ReadmeRenderer from "@/app/components/blocks/ReadmeRenderer";
import SectionEditorCard from "@/app/components/repo-builder/SectionEditorCard";
import {
  REPO_MARKDOWN_STYLES,
  createInitialRepoSections,
  composeRepoMarkdown,
  mergeAiSectionContent,
} from "@/app/lib/repoBuilder/core";

const DRAFT_STORAGE_KEY = "githance:repo-builder:draft:v1";

function getRepositoryKey(repo = {}) {
  return `${String(repo?.owner || "").trim()}/${String(repo?.name || "").trim()}`;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizeStyle(styleId) {
  const normalized = String(styleId || "").trim().toLowerCase();
  const exists = REPO_MARKDOWN_STYLES.some((style) => style.id === normalized);
  return exists ? normalized : REPO_MARKDOWN_STYLES[0].id;
}

function normalizeDraftSections(value, fallback = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const id = String(section.id || "").trim().toLowerCase();
      const title = String(section.title || "").trim();
      const description = String(section.description || "").trim();
      if (!id || !title) return null;

      return {
        id,
        title,
        description,
        enabled: section.enabled !== false,
        content: String(section.content || ""),
      };
    })
    .filter(Boolean);
}

export default function RepoBuilderPage() {
  const { data: session, status } = useSession();
  const [repositories, setRepositories] = useState([]);
  const [repositoriesLoading, setRepositoriesLoading] = useState(false);
  const [repositoriesError, setRepositoriesError] = useState("");
  const [selectedRepositoryKey, setSelectedRepositoryKey] = useState("");

  const [repoContext, setRepoContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState("");

  const [markdownStyle, setMarkdownStyle] = useState(REPO_MARKDOWN_STYLES[0].id);
  const [sections, setSections] = useState([]);
  const [appendToExistingReadme, setAppendToExistingReadme] = useState(false);

  const [aiBusy, setAiBusy] = useState(false);
  const [aiBusySectionId, setAiBusySectionId] = useState("");
  const [aiError, setAiError] = useState("");

  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [publishError, setPublishError] = useState("");

  const isAuthenticated =
    status === "authenticated" &&
    Boolean(session?.accessToken) &&
    Boolean(session?.username);

  const selectedRepository = useMemo(
    () => repositories.find((repo) => getRepositoryKey(repo) === selectedRepositoryKey) || null,
    [repositories, selectedRepositoryKey]
  );

  const sectionDefaults = useMemo(() => {
    if (!repoContext) return [];
    return createInitialRepoSections(repoContext);
  }, [repoContext]);

  const sectionDefaultsById = useMemo(() => {
    return Object.fromEntries(sectionDefaults.map((section) => [section.id, section]));
  }, [sectionDefaults]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;
    const loadRepositories = async () => {
      try {
        setRepositoriesLoading(true);
        setRepositoriesError("");
        const response = await fetch("/api/repo-builder/repositories", {
          method: "POST",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload?.ok || !Array.isArray(payload?.repositories)) {
          throw new Error(payload?.error || "Failed to fetch repositories");
        }

        if (cancelled) return;
        setRepositories(payload.repositories);
        if (!selectedRepositoryKey && payload.repositories.length) {
          setSelectedRepositoryKey(getRepositoryKey(payload.repositories[0]));
        }
      } catch (error) {
        if (cancelled) return;
        setRepositoriesError(error?.message || "Failed to load repositories");
      } finally {
        if (!cancelled) {
          setRepositoriesLoading(false);
        }
      }
    };

    loadRepositories();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedRepositoryKey]);

  useEffect(() => {
    if (!isAuthenticated || !selectedRepository) return;

    let cancelled = false;
    const loadContext = async () => {
      try {
        setContextLoading(true);
        setContextError("");
        setAiError("");
        setPublishMessage("");
        setPublishError("");

        const response = await fetch("/api/repo-builder/context", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner: selectedRepository.owner,
            repo: selectedRepository.name,
          }),
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.ok) {
          throw new Error(payload?.error || "Failed to load repository context");
        }
        if (cancelled) return;

        setRepoContext(payload);

        const repoKey = getRepositoryKey(selectedRepository);
        const storedRaw = typeof window !== "undefined" ? window.localStorage.getItem(DRAFT_STORAGE_KEY) : "";
        const stored = safeJsonParse(storedRaw || "{}", {});
        const storedDraft = stored?.repos?.[repoKey];

        if (storedDraft) {
          const draftSections = normalizeDraftSections(storedDraft.sections, []);
          if (draftSections.length) {
            setSections(draftSections);
            setMarkdownStyle(normalizeStyle(storedDraft.style));
            setAppendToExistingReadme(Boolean(storedDraft.appendToExistingReadme));
            return;
          }
        }

        setSections(createInitialRepoSections(payload));
        setMarkdownStyle(REPO_MARKDOWN_STYLES[0].id);
        setAppendToExistingReadme(false);
      } catch (error) {
        if (cancelled) return;
        setRepoContext(null);
        setSections([]);
        setContextError(error?.message || "Failed to load repository context");
      } finally {
        if (!cancelled) {
          setContextLoading(false);
        }
      }
    };

    loadContext();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, selectedRepository]);

  useEffect(() => {
    if (!selectedRepository || !sections.length) return;
    if (typeof window === "undefined") return;

    const repoKey = getRepositoryKey(selectedRepository);
    const existingRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    const existing = safeJsonParse(existingRaw || "{}", {});

    const next = {
      ...existing,
      repos: {
        ...(existing?.repos || {}),
        [repoKey]: {
          updatedAt: new Date().toISOString(),
          style: markdownStyle,
          appendToExistingReadme,
          sections,
        },
      },
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
  }, [appendToExistingReadme, markdownStyle, sections, selectedRepository]);

  const generatedMarkdown = useMemo(() => {
    if (!repoContext || !sections.length) return "";
    return composeRepoMarkdown({
      repository: repoContext.repository,
      sections,
      style: markdownStyle,
    });
  }, [repoContext, sections, markdownStyle]);

  const finalMarkdown = useMemo(() => {
    const existingReadme = String(repoContext?.readme?.content || "").trim();
    if (!appendToExistingReadme || !existingReadme) {
      return generatedMarkdown;
    }

    const generated = generatedMarkdown.trim();
    if (!generated) return `${existingReadme}\n`;

    return `${existingReadme}\n\n---\n\n${generated}\n`;
  }, [appendToExistingReadme, generatedMarkdown, repoContext?.readme?.content]);

  const updateSectionEnabled = (sectionId) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, enabled: !section.enabled } : section
      )
    );
  };

  const updateSectionContent = (sectionId, content) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, content: String(content || "") } : section
      )
    );
  };

  const resetSection = (sectionId) => {
    const fallback = sectionDefaultsById[sectionId];
    if (!fallback) return;
    setSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...fallback } : section))
    );
  };

  const requestAiForSections = async ({ sectionIds, mode = "fill-empty" }) => {
    if (!repoContext || !sectionIds.length) return;

    try {
      setAiError("");
      setAiBusy(true);

      const requestedSections = sections.filter((section) => sectionIds.includes(section.id));
      const response = await fetch("/api/ai/repo-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context: repoContext,
          sections: requestedSections,
          style: markdownStyle,
          mode,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Failed to generate AI content");
      }

      setSections((prev) =>
        mergeAiSectionContent(
          prev,
          payload.sections || {},
          mode === "rewrite-all" ? "rewrite-all" : "fill-empty"
        )
      );
    } catch (error) {
      setAiError(error?.message || "Failed to generate AI content");
    } finally {
      setAiBusy(false);
      setAiBusySectionId("");
    }
  };

  const requestAiForSingleSection = async (sectionId) => {
    setAiBusySectionId(sectionId);
    await requestAiForSections({
      sectionIds: [sectionId],
      mode: "rewrite-all",
    });
  };

  const handlePublish = async () => {
    if (!isAuthenticated) {
      await signIn("github", { callbackUrl: "/repo-builder" });
      return;
    }
    if (!selectedRepository) return;
    if (!finalMarkdown.trim()) {
      setPublishError("Markdown is empty. Add content before publishing.");
      return;
    }

    try {
      setPublishBusy(true);
      setPublishError("");
      setPublishMessage("");

      const response = await fetch("/api/publish-readme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: selectedRepository.owner,
          repo: selectedRepository.name,
          readmeContent: finalMarkdown,
          readmeMessage: "docs(readme): update via GitHance repo builder",
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Failed to publish README");
      }

      setPublishMessage(
        `README published to ${selectedRepository.owner}/${selectedRepository.name}.`
      );
    } catch (error) {
      setPublishError(error?.message || "Failed to publish README");
    } finally {
      setPublishBusy(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#0b0d0f] p-8 text-white">
        <div className="mx-auto max-w-6xl rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          Loading session...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0b0d0f] p-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Repo Builder</p>
          <h1 className="mt-3 text-3xl font-semibold">Sign in to build repository READMEs</h1>
          <p className="mt-3 text-sm text-white/65">
            Repository analysis and publish actions require your GitHub session.
          </p>
          <button
            onClick={() => signIn("github", { callbackUrl: "/repo-builder" })}
            className="mt-6 rounded-full bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8c3a]"
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0d0f] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Repo Builder</p>
          <h1 className="mt-3 text-3xl font-semibold">Repository README Builder</h1>
          <p className="mt-2 text-sm text-white/65">
            Analyze architecture, infer stack, generate markdown sections with AI, and publish
            directly to your repository.
          </p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label className="text-xs uppercase tracking-[0.14em] text-white/50">
                    Repository
                  </label>
                  <select
                    value={selectedRepositoryKey}
                    onChange={(event) => setSelectedRepositoryKey(event.target.value)}
                    disabled={repositoriesLoading || !repositories.length}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#0f1115] px-3 py-2 text-sm text-white outline-none"
                  >
                    {!repositories.length ? (
                      <option value="">No repositories available</option>
                    ) : (
                      repositories.map((repo) => (
                        <option key={repo.id || getRepositoryKey(repo)} value={getRepositoryKey(repo)}>
                          {repo.owner}/{repo.name} {repo.private ? "(private)" : ""}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs uppercase tracking-[0.14em] text-white/50">
                    Markdown style
                  </label>
                  <select
                    value={markdownStyle}
                    onChange={(event) => setMarkdownStyle(normalizeStyle(event.target.value))}
                    className="mt-2 w-full rounded-xl border border-white/15 bg-[#0f1115] px-3 py-2 text-sm text-white outline-none"
                  >
                    {REPO_MARKDOWN_STYLES.map((style) => (
                      <option key={style.id} value={style.id}>
                        {style.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {repositoriesError ? (
                <p className="mt-3 text-sm text-red-300">{repositoriesError}</p>
              ) : null}
              {contextError ? <p className="mt-3 text-sm text-red-300">{contextError}</p> : null}

              {selectedRepository ? (
                <div className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                  <p>
                    <span className="text-white/40">Repo:</span> {selectedRepository.owner}/
                    {selectedRepository.name}
                  </p>
                  <p>
                    <span className="text-white/40">Visibility:</span>{" "}
                    {selectedRepository.visibility || (selectedRepository.private ? "private" : "public")}
                  </p>
                  <p>
                    <span className="text-white/40">Updated:</span>{" "}
                    {selectedRepository.updated_at
                      ? new Date(selectedRepository.updated_at).toLocaleString()
                      : "--"}
                  </p>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 text-xs text-white/70">
                  <input
                    type="checkbox"
                    checked={appendToExistingReadme}
                    onChange={(event) => setAppendToExistingReadme(event.target.checked)}
                    className="h-4 w-4 rounded border-white/30 bg-transparent"
                  />
                  Append generated docs to existing README
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={aiBusy || contextLoading || !sections.length}
                  onClick={() =>
                    requestAiForSections({
                      sectionIds: sections.filter((section) => section.enabled).map((section) => section.id),
                      mode: "fill-empty",
                    })
                  }
                  className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {aiBusy ? "AI running..." : "AI Fill Missing Sections"}
                </button>
                <button
                  type="button"
                  disabled={aiBusy || contextLoading || !sections.length}
                  onClick={() =>
                    requestAiForSections({
                      sectionIds: sections.filter((section) => section.enabled).map((section) => section.id),
                      mode: "rewrite-all",
                    })
                  }
                  className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Rewrite Enabled Sections
                </button>
              </div>
              {aiError ? <p className="mt-2 text-xs text-red-300">{aiError}</p> : null}
            </section>

            <div className="space-y-3">
              {contextLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                  Analyzing repository context...
                </div>
              ) : null}

              {!contextLoading && sections.length
                ? sections.map((section) => (
                    <SectionEditorCard
                      key={section.id}
                      section={section}
                      disabled={contextLoading}
                      aiBusy={aiBusy && aiBusySectionId === section.id}
                      onToggle={updateSectionEnabled}
                      onContentChange={updateSectionContent}
                      onReset={resetSection}
                      onRequestAi={requestAiForSingleSection}
                    />
                  ))
                : null}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">Preview</p>
                  <h2 className="mt-2 text-xl font-semibold">Generated README</h2>
                </div>
                <button
                  type="button"
                  disabled={publishBusy || !finalMarkdown.trim()}
                  onClick={handlePublish}
                  className="rounded-full bg-[#ff7a1a] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#ff8c3a] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishBusy ? "Publishing..." : "Publish README"}
                </button>
              </div>

              {publishMessage ? (
                <p className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  {publishMessage}
                </p>
              ) : null}
              {publishError ? (
                <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                  {publishError}
                </p>
              ) : null}

              <div className="mt-4 max-h-[560px] overflow-auto rounded-xl border border-white/10 bg-[#0f1115] p-4">
                {finalMarkdown.trim() ? (
                  <ReadmeRenderer readme={finalMarkdown} compact />
                ) : (
                  <p className="text-sm text-white/55">
                    README preview will appear after repository analysis and section generation.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Raw Markdown</p>
              <textarea
                value={finalMarkdown}
                readOnly
                className="mt-3 min-h-72 w-full rounded-xl border border-white/10 bg-[#0f1115] p-3 font-mono text-xs text-white/80 outline-none"
              />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

