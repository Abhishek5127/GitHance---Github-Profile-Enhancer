
const columns = [
  {
    title: "Product",
    links: ["Profile Builder", "README Studio", "Insights", "Templates"],
  },
  {
    title: "Company",
    links: ["About", "Careers", "Blog", "Press"],
  },
  {
    title: "Resources",
    links: ["Docs", "Support", "Security", "Status"],
  },
];

export default function Footer() {

  return (
    <footer className="border-t border-white/10 bg-[#0b0d0f]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-12 text-white/70 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="text-lg font-semibold text-white">GitHance</div>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            The developer workspace for high-impact GitHub profiles and documentation.
          </p>
          <div className="mt-6 flex items-center gap-3 text-xs text-white/50">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">SOC2 ready</span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">SSO</span>
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <div className="text-sm font-semibold text-white">{column.title}</div>
              <ul className="mt-3 space-y-2 text-sm">
                {column.links.map((link) => (
                  <li key={link}>
                    <a href={`${link}`} className="transition hover:text-white">
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        (c) 2026 GitHance. Crafted for developers.
      </div>
    </footer>
  );
}
