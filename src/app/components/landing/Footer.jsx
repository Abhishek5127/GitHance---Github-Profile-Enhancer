import Link from "next/link";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Product overview", href: "/product" },
      { label: "Solutions", href: "/solutions" },
      { label: "Process", href: "/process" },
      { label: "Contribute", href: "/contribute" },
    ],
  },
  {
    title: "Tools",
    links: [
      { label: "Repository analyzer", href: "/analyze" },
      { label: "Profile builder", href: "/profile-builder" },
      { label: "Profile compare", href: "/profile-compare" },
      { label: "README preview", href: "/readme-preview" },
    ],
  },
  {
    title: "Use Cases",
    links: [
      { label: "GitHub README generator", href: "/analyze" },
      { label: "Developer profile optimization", href: "/profile-builder" },
      { label: "Repository documentation workflow", href: "/process" },
      { label: "Public GitHub tooling", href: "/product" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0b0d0f]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 text-white/70 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/" className="text-lg font-semibold text-white">
            GitHance
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/60">
            The public developer workspace for GitHub README generation, repository analysis, security review, and profile visibility.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs text-white/50">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">README workflows</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Profile optimization</span>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <div className="text-sm font-semibold text-white">{column.title}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="transition hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © 2026 GitHance. Built for developers who want stronger GitHub discoverability.
      </div>
    </footer>
  );
}
