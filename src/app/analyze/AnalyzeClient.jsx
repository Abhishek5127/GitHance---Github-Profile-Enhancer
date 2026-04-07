"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  loadProfileBuilderContextUsername,
  saveProfileBuilderContextUsername,
} from "@/app/lib/profileBuilderContext";

const REPOS_PER_PAGE = 18;
const FILTER_OPTIONS = [
  { id: "all", label: "All repos" },
  { id: "missing-readme", label: "Needs README" },
  { id: "with-readme", label: "README ready" },
  { id: "forks", label: "Forks" },
  { id: "public", label: "Public" },
];

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const updatedAtFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function normalizeUsername(value) {
  return String(value || "")
    .trim()
    .replace(/^@+/, "")
    .toLowerCase();
}

function formatCount(value) {
  return compactNumberFormatter.format(Number(value) || 0);
}

function formatUpdatedAt(value) {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return updatedAtFormatter.format(date);
}

function getReadmeStatus(repo) {
  if (repo?.readmeStatus === "available") return "available";
  if (repo?.readmeStatus === "missing") return "missing";
  return "unknown";
}

function matchesFilter(repo, filterId) {
  const readmeStatus = getReadmeStatus(repo);

  if (filterId === "missing-readme") return readmeStatus === "missing";
  if (filterId === "with-readme") return readmeStatus === "available";
  if (filterId === "forks") return Boolean(repo.fork);
  if (filterId === "public") return !repo.private;
  return true;
}

function matchesSearch(repo, query) {
  if (!query) return true;

  const haystack = [
    repo.name,
    repo.description,
    repo.language,
    ...(Array.isArray(repo.topics) ? repo.topics : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function getReadmePresentation(repo) {
  const readmeStatus = getReadmeStatus(repo);

  if (readmeStatus === "available") {
    return {
      badgeClass: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
      badgeLabel: "README ready",
      spotlightClass: "bg-emerald-400/12",
      actionLabel: "Open README Lab",
    };
  }

  if (readmeStatus === "missing") {
    return {
      badgeClass: "border-amber-400/30 bg-amber-500/10 text-amber-100",
      badgeLabel: "README missing",
      spotlightClass: "bg-[#ff7a1a]/14",
      actionLabel: "Create README",
    };
  }

  return {
    badgeClass: "border-cyan-400/30 bg-cyan-500/10 text-cyan-100",
    badgeLabel: "README unknown",
    spotlightClass: "bg-cyan-400/12",
    actionLabel: "Open README Lab",
  };
}

function buildRepoRoute(basePath, repo, fallbackOwner) {
  const owner = String(repo?.owner || fallbackOwner || "").trim().toLowerCase();
  const repoName = String(repo?.name || "").trim();
  if (!repoName) return basePath;

  const query = owner ? `?owner=${encodeURIComponent(owner)}` : "";
  return `${basePath}/${encodeURIComponent(repoName)}${query}`;
}

function StatCard({ label, value, hint, accent = "orange" }) {
  const accentClass =
    accent === "cyan"
      ? "from-cyan-400/16 to-cyan-400/0 border-cyan-400/20"
      : accent === "emerald"
        ? "from-emerald-400/16 to-emerald-400/0 border-emerald-400/20"
        : accent === "amber"
          ? "from-amber-400/16 to-amber-400/0 border-amber-400/20"
          : "from-[#ff7a1a]/18 to-[#ff7a1a]/0 border-[#ff7a1a]/20";

  return (
    <div className={`rounded-[24px] border bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.96))] p-5 ${accentClass}`}>
      <p className="text-xs uppercase tracking-[0.24em] text-white/45">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{hint}</p>
    </div>
  );
}

function FilterChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-white bg-white text-black"
          : "border-white/15 bg-white/5 text-white/72 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function RepoSkeletonCard() {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[#12161c] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
      <div className="h-4 w-24 rounded-full bg-white/10" />
      <div className="mt-4 h-7 w-2/3 rounded-full bg-white/10" />
      <div className="mt-4 h-4 w-full rounded-full bg-white/5" />
      <div className="mt-2 h-4 w-5/6 rounded-full bg-white/5" />
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        <div className="h-11 rounded-full bg-white/10" />
        <div className="h-11 rounded-full bg-white/5" />
      </div>
    </div>
  );
}

function RepositoryCard({ repo, fallbackOwner }) {
  const readmeHref = buildRepoRoute("/readme-analyze", repo, fallbackOwner);
  const securityHref = buildRepoRoute("/repository-security", repo, fallbackOwner);
  const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 3) : [];
  const readmePresentation = getReadmePresentation(repo);

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.98),rgba(11,13,15,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] transition hover:-translate-y-1 hover:border-white/20">
      <div
        className={`pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full blur-3xl ${readmePresentation.spotlightClass}`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-white/42">
              {repo.private ? "Private repository" : "Public repository"}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{repo.name}</h2>
          </div>

          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${readmePresentation.badgeClass}`}>
            {readmePresentation.badgeLabel}
          </span>
        </div>

        <p className="mt-4 min-h-[72px] text-sm leading-6 text-white/64">
          {repo.description || "No description yet. You can still jump straight into README generation or a security scan."}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/72">
            {repo.language || "Unknown stack"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/72">
            {formatCount(repo.stargazers_count)} stars
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/72">
            Updated {formatUpdatedAt(repo.updated_at)}
          </span>
          {repo.fork ? (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-white/72">
              Fork
            </span>
          ) : null}
          {topics.map((topic) => (
            <span
              key={topic}
              className="rounded-full border border-cyan-400/20 bg-cyan-500/8 px-3 py-1.5 text-cyan-200/90"
            >
              {topic}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href={readmeHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff7a1a] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ff8d3b]"
          >
            {readmePresentation.actionLabel}
          </Link>
          <Link
            href={securityHref}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            Run Security Analysis
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span>{repo.full_name || repo.name}</span>
          <a
            href={repo.html_url}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-white/10 px-3 py-1.5 text-white/70 transition hover:border-white/20 hover:text-white"
          >
            Open on GitHub
          </a>
        </div>
      </div>
    </article>
  );
}

export default function AnalyzePage({ initialUsername = "", children }) {
  const [githubUsername, setGithubUsername] = useState("");
  const [draftUsername, setDraftUsername] = useState("");
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const requestedUsername = useMemo(
    () => normalizeUsername(initialUsername),
    [initialUsername]
  );
  const normalizedDraftUsername = normalizeUsername(draftUsername);
  const canLoadRepositories = Boolean(normalizedDraftUsername);

  useEffect(() => {
    const storedUsername = loadProfileBuilderContextUsername();
    const initialUsername = requestedUsername || storedUsername;
    if (!initialUsername) return;

    setGithubUsername(initialUsername);
    setDraftUsername(initialUsername);

    if (requestedUsername) {
      saveProfileBuilderContextUsername(initialUsername);
    }
  }, [requestedUsername]);

  async function loadRepositories(username, nextPage = 1, append = false) {
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) return;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: normalizedUsername,
          page: nextPage,
          perPage: REPOS_PER_PAGE,
          includeReadme: true,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.repos)) {
        throw new Error(payload?.error || "Failed to load repositories");
      }

      setRepositories((current) => (append ? [...current, ...payload.repos] : payload.repos));
      setPage(nextPage);
      setHasMore(Boolean(payload?.hasNextPage));
    } catch (nextError) {
      setError(nextError?.message || "Failed to load repositories");
      if (!append) {
        setRepositories([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    if (!githubUsername) return;
    loadRepositories(githubUsername, 1, false);
  }, [githubUsername]);

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleRepositories = useMemo(
    () =>
      repositories.filter(
        (repo) =>
          matchesFilter(repo, activeFilter) &&
          matchesSearch(repo, normalizedSearchQuery)
      ),
    [activeFilter, normalizedSearchQuery, repositories]
  );

  const readmeReadyCount = repositories.filter(
    (repo) => getReadmeStatus(repo) === "available"
  ).length;
  const missingReadmeCount = repositories.filter(
    (repo) => getReadmeStatus(repo) === "missing"
  ).length;
  const forkedRepositoriesCount = repositories.filter((repo) => repo.fork).length;

  const handleUsernameSubmit = (event) => {
    event.preventDefault();
    const normalizedUsername = normalizedDraftUsername;
    if (!normalizedUsername) {
      setError("Enter a GitHub username to load repositories.");
      return;
    }

    setRepositories([]);
    setHasMore(false);
    setGithubUsername(normalizedUsername);
    setDraftUsername(normalizedUsername);
    saveProfileBuilderContextUsername(normalizedUsername);

    if (normalizedUsername === githubUsername) {
      loadRepositories(normalizedUsername, 1, false);
    }
  };

  const showRepositorySkeletons = loading && repositories.length === 0;

  return (
    <div className="min-h-[100svh] overflow-x-clip bg-[#0b0d0f] text-white">
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-28 top-8 h-72 w-72 rounded-full bg-[radial-gradient(circle,_rgba(255,122,26,0.28),_transparent_66%)] blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[radial-gradient(circle,_rgba(48,214,255,0.2),_transparent_62%)] blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,_rgba(255,255,255,0.08),_transparent_60%)] blur-3xl" />

        {children}

        <section className="mx-auto grid w-full max-w-7xl grid-cols-1 items-start gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-4">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.34em] text-[#ffb37f]">
              Repository Preview
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
              Pick a GitHub username and jump straight into the next task.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/68">
              Load public repositories for any GitHub username, then move directly into README work or a security review from the same username-based workspace.
            </p>

            <form onSubmit={handleUsernameSubmit} className="mt-8 max-w-xl">
              <label className="text-xs uppercase tracking-[0.24em] text-white/45" htmlFor="analyze-username">
                GitHub username
              </label>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <input
                  id="analyze-username"
                  required
                  value={draftUsername}
                  onChange={(event) => setDraftUsername(event.target.value)}
                  placeholder="e.g. torvalds"
                  className="h-14 flex-1 rounded-2xl border border-white/10 bg-[#0f1115] px-4 text-white outline-none placeholder:text-white/30"
                />
                <button
                  type="submit"
                  disabled={!canLoadRepositories || loading}
                  className="inline-flex min-h-14 items-center justify-center rounded-2xl bg-[#ff7a1a] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[#ff8d3b] disabled:cursor-not-allowed disabled:bg-[#ff7a1a]/24 disabled:text-white/40 disabled:hover:bg-[#ff7a1a]/24"
                >
                  {loading ? "Loading repositories..." : "Load repositories"}
                </button>
              </div>
            </form>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-white/60">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                {githubUsername ? `@${githubUsername}` : "Public GitHub username required"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                Public repository preview
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                README + Security launchpad
              </span>
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/45">
                  Recently Updated
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Quick launch panel
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/65">
                {repositories.length > 0 ? `${repositories.length} loaded` : "Ready"}
              </span>
            </div>

            {!githubUsername ? (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1115] p-5 text-sm leading-7 text-white/65">
                Enter any GitHub username above to load repositories and start README or security work.
              </div>
            ) : showRepositorySkeletons ? (
              <div className="mt-6 space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 rounded-2xl border border-white/10 bg-[#0f1115]" />
                ))}
              </div>
            ) : repositories.slice(0, 3).length > 0 ? (
              <div className="mt-6 space-y-3">
                {repositories.slice(0, 3).map((repo) => (
                  <div key={repo.id || repo.name} className="rounded-2xl border border-white/10 bg-[#0f1115] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{repo.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
                          Updated {formatUpdatedAt(repo.updated_at)}
                        </p>
                      </div>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-white/60">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Link
                        href={buildRepoRoute("/readme-analyze", repo, githubUsername)}
                        className="rounded-full bg-[#ff7a1a] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#ff8d3b]"
                      >
                        README Lab
                      </Link>
                      <Link
                        href={buildRepoRoute("/repository-security", repo, githubUsername)}
                        className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/78 transition hover:bg-white/10 hover:text-white"
                      >
                        Security Analysis
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0f1115] p-5 text-sm leading-7 text-white/65">
                No repositories are loaded yet for this username.
              </div>
            )}
          </div>
        </section>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:px-4">
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Loaded Repos"
            value={repositories.length}
            hint="Recently updated repositories currently in your workspace preview."
            accent="orange"
          />
          <StatCard
            label="README Ready"
            value={readmeReadyCount}
            hint="Repositories where a README is confirmed and can be refined immediately."
            accent="emerald"
          />
          <StatCard
            label="Need README"
            value={missingReadmeCount}
            hint="Repositories where GitHub explicitly reports that the README is missing."
            accent="amber"
          />
          <StatCard
            label="Forked Repos"
            value={forkedRepositoriesCount}
            hint="Repositories in this public preview that GitHub marks as forks."
            accent="cyan"
          />
        </section>

        <section className="mt-6 rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.98),rgba(11,13,15,0.98))] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-white/45">Repository Controls</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Find the right repository faster</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/65">
                Search by repository name, description, or topic, then narrow the list to the repos that need README work or security review next.
              </p>
            </div>

            <div className="w-full lg:max-w-md">
              <label className="text-xs uppercase tracking-[0.24em] text-white/45" htmlFor="repo-search">
                Search
              </label>
              <input
                id="repo-search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search repositories, stacks, or topics"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f1115] px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((option) => (
              <FilterChip
                key={option.id}
                active={activeFilter === option.id}
                label={option.label}
                onClick={() => setActiveFilter(option.id)}
              />
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
            <p>
              Showing {visibleRepositories.length} of {repositories.length} loaded repositories
              {normalizedSearchQuery ? ` for "${searchQuery}"` : ""}.
            </p>
            {(searchQuery || activeFilter !== "all") && visibleRepositories.length === 0 ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveFilter("all");
                }}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/75 transition hover:bg-white/10 hover:text-white"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        </section>

        {error ? (
          <section className="mt-6 rounded-[28px] border border-red-500/25 bg-red-500/10 p-6 text-red-100">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-red-200/80">Repository Load Failed</p>
                <h2 className="mt-2 text-2xl font-semibold">{error}</h2>
              </div>
              {githubUsername ? (
                <button
                  type="button"
                  onClick={() => loadRepositories(githubUsername, 1, false)}
                  className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Retry
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

        {showRepositorySkeletons ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <RepoSkeletonCard key={index} />
            ))}
          </section>
        ) : visibleRepositories.length > 0 ? (
          <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleRepositories.map((repo) => (
              <RepositoryCard
                key={repo.id || repo.full_name || repo.name}
                repo={repo}
                fallbackOwner={githubUsername}
              />
            ))}
          </section>
        ) : githubUsername && !error ? (
          <section className="mt-6 rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,22,28,0.96),rgba(11,13,15,0.98))] p-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <p className="text-xs uppercase tracking-[0.24em] text-white/45">No Match Found</p>
            <h2 className="mt-3 text-3xl font-semibold text-white">No repositories match this view right now.</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
              Try a different search phrase or switch filters. Your repository preview updates instantly and keeps the action links ready.
            </p>
          </section>
        ) : null}

        {hasMore && !error && githubUsername ? (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => loadRepositories(githubUsername, page + 1, true)}
              disabled={loadingMore}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingMore ? "Loading more repositories..." : "Load more repositories"}
            </button>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-white/10 bg-[#0b0d0f]">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-white/50 sm:px-6 lg:px-4 sm:flex-row sm:items-center sm:justify-between">
          <p>GitHance repository preview keeps README work and security review one click away.</p>
          <Link href="/profile-builder" className="text-white/72 transition hover:text-white">
            Open profile builder
          </Link>
        </div>
      </footer>
    </div>
  );
}
