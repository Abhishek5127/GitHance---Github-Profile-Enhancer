const TECH_CATEGORY_CONFIG = [
  { id: "languages", label: "Languages" },
  { id: "frameworks", label: "Libraries & Frameworks" },
  { id: "tools", label: "Tools & Platforms" },
  { id: "databases", label: "Databases" },
];

const DEFAULT_THEME = "midnight";
const DEFAULT_VARIANT = "categorized";

export const TECH_STACK_CATEGORY_ORDER = TECH_CATEGORY_CONFIG.map(
  (category) => category.id
);

export const TECH_STACK_CATEGORY_LABELS = TECH_CATEGORY_CONFIG.reduce(
  (result, category) => {
    result[category.id] = category.label;
    return result;
  },
  {}
);

const escapeRegex = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeAlias = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const slugify = (value) =>
  normalizeAlias(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "tech";

const isValidCategory = (value) => TECH_STACK_CATEGORY_ORDER.includes(value);

const tech = ({ id, name, category, iconId = id, aliases = [] }) => ({
  id,
  name,
  category,
  iconId,
  aliases: Array.from(
    new Set([name, ...aliases].map(normalizeAlias).filter(Boolean))
  ),
});

export const TECH_STACK_LIBRARY = [
  tech({
    id: "c",
    name: "C",
    category: "languages",
    aliases: ["ansi c", "language:c"],
  }),
  tech({
    id: "cplusplus",
    name: "C++",
    category: "languages",
    iconId: "cpp",
    aliases: ["c++", "cpp", "cplusplus", "language:c++"],
  }),
  tech({
    id: "csharp",
    name: "C#",
    category: "languages",
    iconId: "cs",
    aliases: ["c#", "csharp", "language:c#", ".net c#"],
  }),
  tech({
    id: "javascript",
    name: "JavaScript",
    category: "languages",
    iconId: "js",
    aliases: ["javascript", "js", "ecmascript", "language:javascript"],
  }),
  tech({
    id: "typescript",
    name: "TypeScript",
    category: "languages",
    iconId: "ts",
    aliases: ["typescript", "ts", "language:typescript"],
  }),
  tech({
    id: "html",
    name: "HTML",
    category: "languages",
    iconId: "html",
    aliases: ["html", "html5", "language:html"],
  }),
  tech({
    id: "css",
    name: "CSS",
    category: "languages",
    iconId: "css",
    aliases: ["css", "css3", "language:css"],
  }),
  tech({
    id: "java",
    name: "Java",
    category: "languages",
    aliases: ["java", "language:java"],
  }),
  tech({
    id: "kotlin",
    name: "Kotlin",
    category: "languages",
    aliases: ["kotlin", "language:kotlin"],
  }),
  tech({
    id: "python",
    name: "Python",
    category: "languages",
    iconId: "py",
    aliases: ["python", "py", "language:python", "jupyter notebook"],
  }),
  tech({
    id: "dart",
    name: "Dart",
    category: "languages",
    aliases: ["dart", "language:dart"],
  }),
  tech({
    id: "go",
    name: "Go",
    category: "languages",
    aliases: ["golang", "go language", "language:go"],
  }),
  tech({
    id: "rust",
    name: "Rust",
    category: "languages",
    aliases: ["rust", "language:rust"],
  }),
  tech({
    id: "php",
    name: "PHP",
    category: "languages",
    aliases: ["php", "language:php"],
  }),
  tech({
    id: "ruby",
    name: "Ruby",
    category: "languages",
    aliases: ["ruby", "language:ruby"],
  }),
  tech({
    id: "swift",
    name: "Swift",
    category: "languages",
    aliases: ["swift", "language:swift"],
  }),
  tech({
    id: "scala",
    name: "Scala",
    category: "languages",
    aliases: ["scala", "language:scala"],
  }),
  tech({
    id: "r",
    name: "R",
    category: "languages",
    aliases: ["r language", "language:r"],
  }),
  tech({
    id: "bash",
    name: "Bash",
    category: "languages",
    aliases: ["bash", "shell scripting", "language:shell"],
  }),
  tech({
    id: "powershell",
    name: "PowerShell",
    category: "languages",
    aliases: ["powershell", "pwsh", "language:powershell"],
  }),
  tech({
    id: "perl",
    name: "Perl",
    category: "languages",
    aliases: ["perl", "language:perl"],
  }),
  tech({
    id: "elixir",
    name: "Elixir",
    category: "languages",
    aliases: ["elixir", "language:elixir"],
  }),

  tech({
    id: "react",
    name: "React",
    category: "frameworks",
    aliases: ["react", "reactjs", "react.js"],
  }),
  tech({
    id: "nextjs",
    name: "Next.js",
    category: "frameworks",
    aliases: ["next.js", "nextjs", "next js"],
  }),
  tech({
    id: "vue",
    name: "Vue",
    category: "frameworks",
    aliases: ["vue", "vuejs", "vue.js"],
  }),
  tech({
    id: "nuxtjs",
    name: "Nuxt",
    category: "frameworks",
    aliases: ["nuxt", "nuxtjs", "nuxt.js"],
  }),
  tech({
    id: "angular",
    name: "Angular",
    category: "frameworks",
    aliases: ["angular", "angularjs"],
  }),
  tech({
    id: "svelte",
    name: "Svelte",
    category: "frameworks",
    aliases: ["svelte", "sveltekit"],
  }),
  tech({
    id: "flutter",
    name: "Flutter",
    category: "frameworks",
    aliases: ["flutter", "flutter sdk"],
  }),
  tech({
    id: "spring",
    name: "Spring",
    category: "frameworks",
    aliases: ["spring", "spring boot", "springboot"],
  }),
  tech({
    id: "nodejs",
    name: "Node.js",
    category: "frameworks",
    aliases: ["node", "node.js", "nodejs"],
  }),
  tech({
    id: "express",
    name: "Express",
    category: "frameworks",
    aliases: ["express", "express.js", "expressjs"],
  }),
  tech({
    id: "nestjs",
    name: "NestJS",
    category: "frameworks",
    aliases: ["nestjs", "nest.js", "nest js"],
  }),
  tech({
    id: "django",
    name: "Django",
    category: "frameworks",
    aliases: ["django", "django-rest-framework", "drf"],
  }),
  tech({
    id: "flask",
    name: "Flask",
    category: "frameworks",
    aliases: ["flask", "flask api"],
  }),
  tech({
    id: "fastapi",
    name: "FastAPI",
    category: "frameworks",
    aliases: ["fastapi", "fast api"],
  }),
  tech({
    id: "laravel",
    name: "Laravel",
    category: "frameworks",
    aliases: ["laravel"],
  }),
  tech({
    id: "rails",
    name: "Rails",
    category: "frameworks",
    aliases: ["rails", "ruby on rails"],
  }),
  tech({
    id: "dotnet",
    name: ".NET",
    category: "frameworks",
    aliases: [".net", "dotnet", "asp.net", "aspnet"],
  }),
  tech({
    id: "tensorflow",
    name: "TensorFlow",
    category: "frameworks",
    aliases: ["tensorflow", "tf"],
  }),
  tech({
    id: "pytorch",
    name: "PyTorch",
    category: "frameworks",
    aliases: ["pytorch", "torch"],
  }),
  tech({
    id: "vite",
    name: "Vite",
    category: "frameworks",
    aliases: ["vite", "vitejs"],
  }),
  tech({
    id: "tailwindcss",
    name: "Tailwind CSS",
    category: "frameworks",
    iconId: "tailwind",
    aliases: ["tailwind", "tailwindcss", "tailwind css"],
  }),
  tech({
    id: "bootstrap",
    name: "Bootstrap",
    category: "frameworks",
    aliases: ["bootstrap"],
  }),
  tech({
    id: "graphql",
    name: "GraphQL",
    category: "frameworks",
    aliases: ["graphql"],
  }),
  tech({
    id: "redux",
    name: "Redux",
    category: "frameworks",
    aliases: ["redux", "redux toolkit", "rtk"],
  }),
  tech({
    id: "jquery",
    name: "jQuery",
    category: "frameworks",
    aliases: ["jquery"],
  }),
  tech({
    id: "threejs",
    name: "Three.js",
    category: "frameworks",
    aliases: ["three", "three.js", "threejs"],
  }),

  tech({
    id: "git",
    name: "Git",
    category: "tools",
    aliases: ["git", "version control"],
  }),
  tech({
    id: "github",
    name: "GitHub",
    category: "tools",
    aliases: ["github", "github actions", "github workflow"],
  }),
  tech({
    id: "gitlab",
    name: "GitLab",
    category: "tools",
    aliases: ["gitlab", "gitlab ci"],
  }),
  tech({
    id: "docker",
    name: "Docker",
    category: "tools",
    aliases: ["docker", "containerization"],
  }),
  tech({
    id: "kubernetes",
    name: "Kubernetes",
    category: "tools",
    aliases: ["kubernetes", "k8s"],
  }),
  tech({
    id: "terraform",
    name: "Terraform",
    category: "tools",
    aliases: ["terraform", "iac"],
  }),
  tech({
    id: "aws",
    name: "AWS",
    category: "tools",
    aliases: ["aws", "amazon web services"],
  }),
  tech({
    id: "gcp",
    name: "GCP",
    category: "tools",
    aliases: ["gcp", "google cloud", "google cloud platform"],
  }),
  tech({
    id: "azure",
    name: "Azure",
    category: "tools",
    aliases: ["azure", "microsoft azure"],
  }),
  tech({
    id: "vercel",
    name: "Vercel",
    category: "tools",
    aliases: ["vercel", "vercel.app"],
  }),
  tech({
    id: "netlify",
    name: "Netlify",
    category: "tools",
    aliases: ["netlify", "netlify.app"],
  }),
  tech({
    id: "linux",
    name: "Linux",
    category: "tools",
    aliases: ["linux"],
  }),
  tech({
    id: "ubuntu",
    name: "Ubuntu",
    category: "tools",
    aliases: ["ubuntu"],
  }),
  tech({
    id: "vscode",
    name: "VS Code",
    category: "tools",
    aliases: ["vscode", "visual studio code", "vs code"],
  }),
  tech({
    id: "visualstudio",
    name: "Visual Studio",
    category: "tools",
    aliases: ["visual studio", "vs ide"],
  }),
  tech({
    id: "intellij",
    name: "IntelliJ IDEA",
    category: "tools",
    iconId: "idea",
    aliases: ["intellij", "intellij idea", "idea ide"],
  }),
  tech({
    id: "webstorm",
    name: "WebStorm",
    category: "tools",
    aliases: ["webstorm"],
  }),
  tech({
    id: "pycharm",
    name: "PyCharm",
    category: "tools",
    aliases: ["pycharm"],
  }),
  tech({
    id: "androidstudio",
    name: "Android Studio",
    category: "tools",
    aliases: ["android studio", "androidstudio"],
  }),
  tech({
    id: "postman",
    name: "Postman",
    category: "tools",
    aliases: ["postman"],
  }),
  tech({
    id: "npm",
    name: "npm",
    category: "tools",
    aliases: ["npm", "node package manager"],
  }),
  tech({
    id: "yarn",
    name: "Yarn",
    category: "tools",
    aliases: ["yarn", "yarnpkg"],
  }),
  tech({
    id: "pnpm",
    name: "pnpm",
    category: "tools",
    aliases: ["pnpm"],
  }),
  tech({
    id: "figma",
    name: "Figma",
    category: "tools",
    aliases: ["figma"],
  }),
  tech({
    id: "jira",
    name: "Jira",
    category: "tools",
    aliases: ["jira", "atlassian jira"],
  }),

  tech({
    id: "mongodb",
    name: "MongoDB",
    category: "databases",
    aliases: ["mongodb", "mongo"],
  }),
  tech({
    id: "mysql",
    name: "MySQL",
    category: "databases",
    aliases: ["mysql"],
  }),
  tech({
    id: "postgresql",
    name: "PostgreSQL",
    category: "databases",
    iconId: "postgres",
    aliases: ["postgresql", "postgres", "postgre"],
  }),
  tech({
    id: "redis",
    name: "Redis",
    category: "databases",
    aliases: ["redis"],
  }),
  tech({
    id: "sqlite",
    name: "SQLite",
    category: "databases",
    aliases: ["sqlite"],
  }),
  tech({
    id: "firebase",
    name: "Firebase",
    category: "databases",
    aliases: ["firebase", "firestore"],
  }),
  tech({
    id: "supabase",
    name: "Supabase",
    category: "databases",
    aliases: ["supabase"],
  }),
  tech({
    id: "prisma",
    name: "Prisma",
    category: "databases",
    aliases: ["prisma", "prisma orm"],
  }),
  tech({
    id: "mariadb",
    name: "MariaDB",
    category: "databases",
    iconId: "mysql",
    aliases: ["mariadb", "maria db"],
  }),
  tech({
    id: "dynamodb",
    name: "DynamoDB",
    category: "databases",
    aliases: ["dynamodb", "dynamo db"],
  }),
];

const LANGUAGE_TO_TECH_ID = {
  c: "c",
  "c++": "cplusplus",
  "c#": "csharp",
  javascript: "javascript",
  typescript: "typescript",
  html: "html",
  css: "css",
  java: "java",
  kotlin: "kotlin",
  python: "python",
  dart: "dart",
  go: "go",
  rust: "rust",
  php: "php",
  ruby: "ruby",
  swift: "swift",
  scala: "scala",
  r: "r",
  shell: "bash",
  bash: "bash",
  powershell: "powershell",
  perl: "perl",
  elixir: "elixir",
  "jupyter notebook": "python",
  "typescript jsx": "typescript",
};

const DEFAULT_STACK_IDS = [
  "javascript",
  "typescript",
  "react",
  "nextjs",
  "nodejs",
  "tailwindcss",
  "postgresql",
  "git",
];

const TECH_LIBRARY_BY_ID = new Map(
  TECH_STACK_LIBRARY.map((entry) => [entry.id, entry])
);

const TECH_LOOKUP_BY_ALIAS = TECH_STACK_LIBRARY.reduce((lookup, entry) => {
  lookup.set(normalizeAlias(entry.id), entry.id);
  lookup.set(normalizeAlias(entry.name), entry.id);
  entry.aliases.forEach((alias) => {
    lookup.set(alias, entry.id);
  });
  return lookup;
}, new Map());

const categoryLimits = {
  languages: 10,
  frameworks: 16,
  tools: 16,
  databases: 10,
};

const makeCustomItemId = (name, category = "frameworks") =>
  `custom-${category}-${slugify(name)}`;

const cloneItems = (items = []) => items.map((item) => ({ ...item }));

function aliasMatches(text, alias) {
  const value = normalizeAlias(alias);
  if (!value) return false;

  const containsSpecial = /[#.+]/.test(value);
  if (containsSpecial) {
    return text.includes(value);
  }

  if (value.length <= 2) {
    const pattern = new RegExp(
      `(^|[^a-z0-9])${escapeRegex(value)}([^a-z0-9]|$)`,
      "i"
    );
    return pattern.test(text);
  }

  if (value.includes(" ")) {
    return text.includes(value);
  }

  const pattern = new RegExp(
    `(^|[^a-z0-9])${escapeRegex(value)}([^a-z0-9]|$)`,
    "i"
  );
  return pattern.test(text);
}

function findCatalogEntry(raw) {
  const lookupKey = normalizeAlias(raw);
  if (!lookupKey) return null;

  const entryId = TECH_LOOKUP_BY_ALIAS.get(lookupKey);
  if (entryId) return TECH_LIBRARY_BY_ID.get(entryId) || null;

  return null;
}

function dedupeItems(items = []) {
  const seen = new Set();
  const result = [];

  items.forEach((item) => {
    if (!item) return;
    const key = `${item.id || ""}|${normalizeAlias(item.name)}|${item.category}`;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });

  return result;
}

function addScore(scoreMap, itemId, points = 1) {
  if (!itemId || !TECH_LIBRARY_BY_ID.has(itemId)) return;
  scoreMap.set(itemId, (scoreMap.get(itemId) || 0) + points);
}

function normalizeCorpus(repo) {
  const parts = [
    repo?.name,
    repo?.description,
    ...(Array.isArray(repo?.topics) ? repo.topics : []),
    repo?.homepage,
  ];

  return ` ${parts
    .map((value) => normalizeAlias(value))
    .filter(Boolean)
    .join(" ")} `;
}

function inferHomePageTools(repo, scoreMap) {
  const homepage = normalizeAlias(repo?.homepage);
  if (!homepage) return;

  if (homepage.includes("vercel.app")) addScore(scoreMap, "vercel", 3);
  if (homepage.includes("netlify.app")) addScore(scoreMap, "netlify", 3);
  if (homepage.includes("firebaseapp.com")) addScore(scoreMap, "firebase", 2);
}

function ensureCategoryCoverage(items) {
  const withCoverage = [...items];
  const covered = new Set(withCoverage.map((item) => item.category));

  const coverageFallback = {
    languages: "javascript",
    frameworks: "react",
    tools: "git",
  };

  Object.entries(coverageFallback).forEach(([category, fallbackId]) => {
    if (covered.has(category)) return;
    const fallback = TECH_LIBRARY_BY_ID.get(fallbackId);
    if (!fallback) return;
    withCoverage.push({
      id: fallback.id,
      name: fallback.name,
      category: fallback.category,
      iconId: fallback.iconId,
      custom: false,
    });
  });

  return dedupeItems(withCoverage);
}

export function getTechCatalogItem(idOrAlias) {
  if (!idOrAlias) return null;

  const direct = TECH_LIBRARY_BY_ID.get(normalizeAlias(idOrAlias));
  if (direct) return direct;

  return findCatalogEntry(idOrAlias);
}

export function getTechCatalogByCategory(category = "all") {
  if (!isValidCategory(category)) {
    return [...TECH_STACK_LIBRARY];
  }

  return TECH_STACK_LIBRARY.filter((entry) => entry.category === category);
}

export function getTechIconUrl(tech) {
  if (!tech) return "";

  if (typeof tech === "string") {
    const catalog = getTechCatalogItem(tech);
    if (!catalog?.iconId) return "";
    return `https://skillicons.dev/icons?i=${encodeURIComponent(catalog.iconId)}`;
  }

  const catalog = getTechCatalogItem(tech.id || tech.name);
  const iconId = tech.iconId || catalog?.iconId;
  if (!iconId) return "";

  return `https://skillicons.dev/icons?i=${encodeURIComponent(iconId)}`;
}

export function normalizeTechItem(rawItem, fallbackCategory = "frameworks") {
  if (!rawItem) return null;

  if (typeof rawItem === "string") {
    return normalizeTechItem({ name: rawItem, category: fallbackCategory });
  }

  const rawCategory = isValidCategory(rawItem.category)
    ? rawItem.category
    : fallbackCategory;
  const rawName = String(rawItem.name || rawItem.label || "").trim();
  const rawId = normalizeAlias(rawItem.id);

  const catalogById = rawId ? TECH_LIBRARY_BY_ID.get(rawId) : null;
  const catalogByName = rawName ? findCatalogEntry(rawName) : null;
  const catalog = catalogById || catalogByName;

  if (catalog) {
    return {
      id: catalog.id,
      name: rawName || catalog.name,
      category: isValidCategory(rawItem.category)
        ? rawItem.category
        : catalog.category,
      iconId: catalog.iconId,
      custom: false,
    };
  }

  if (!rawName) return null;

  return {
    id:
      rawId && rawId.startsWith("custom-")
        ? rawId
        : makeCustomItemId(rawName, rawCategory),
    name: rawName,
    category: rawCategory,
    iconId: "",
    custom: true,
  };
}

export function groupTechStackItems(items = []) {
  const grouped = TECH_STACK_CATEGORY_ORDER.reduce((result, category) => {
    result[category] = [];
    return result;
  }, {});

  items.forEach((rawItem) => {
    const item = normalizeTechItem(rawItem);
    if (!item) return;
    if (!isValidCategory(item.category)) return;
    grouped[item.category].push(item);
  });

  return grouped;
}

export function normalizeTechStackData(
  rawData = {},
  { includeDefaults = false } = {}
) {
  const variant =
    typeof rawData?.variant === "string" && rawData.variant.trim()
      ? rawData.variant.trim()
      : DEFAULT_VARIANT;

  const theme =
    typeof rawData?.theme === "string" && rawData.theme.trim()
      ? rawData.theme.trim()
      : DEFAULT_THEME;

  const collected = [];

  if (Array.isArray(rawData?.items)) {
    collected.push(...rawData.items);
  }

  TECH_STACK_CATEGORY_ORDER.forEach((category) => {
    const categoryItems = rawData?.[category];
    if (!Array.isArray(categoryItems)) return;
    categoryItems.forEach((entry) => {
      if (typeof entry === "string") {
        collected.push({ name: entry, category });
        return;
      }
      collected.push({ ...entry, category: entry?.category || category });
    });
  });

  if (!collected.length && Array.isArray(rawData?.stack)) {
    rawData.stack.forEach((entry) => {
      collected.push({ name: entry });
    });
  }

  let normalizedItems = dedupeItems(
    collected
      .map((entry) => normalizeTechItem(entry))
      .filter(Boolean)
  );

  if (includeDefaults && !normalizedItems.length) {
    normalizedItems = DEFAULT_STACK_IDS.map((id) =>
      normalizeTechItem({ id }, "frameworks")
    ).filter(Boolean);
  }

  const categories = groupTechStackItems(normalizedItems);
  const stack = normalizedItems.map((item) => item.name);

  return {
    variant,
    theme,
    items: normalizedItems,
    stack,
    ...categories,
  };
}

export function buildTechStackPayload(rawData = {}) {
  const normalized = normalizeTechStackData(rawData);
  const categories = groupTechStackItems(normalized.items);

  return {
    variant: normalized.variant,
    theme: normalized.theme,
    items: cloneItems(normalized.items),
    stack: [...normalized.stack],
    languages: cloneItems(categories.languages),
    frameworks: cloneItems(categories.frameworks),
    tools: cloneItems(categories.tools),
    databases: cloneItems(categories.databases),
  };
}

export function mergeTechStackItems(primary = [], secondary = []) {
  const normalizedPrimary = primary
    .map((item) => normalizeTechItem(item))
    .filter(Boolean);
  const normalizedSecondary = secondary
    .map((item) => normalizeTechItem(item))
    .filter(Boolean);

  return dedupeItems([...normalizedPrimary, ...normalizedSecondary]);
}

export function searchTechCatalog(
  query = "",
  { category = "all", limit = 80 } = {}
) {
  const pool = getTechCatalogByCategory(category);
  const cleanedQuery = normalizeAlias(query);
  if (!cleanedQuery) return pool.slice(0, limit);

  const ranked = pool
    .map((entry) => {
      const haystack = [entry.name, entry.id, ...entry.aliases]
        .map(normalizeAlias)
        .join(" ");

      if (!haystack.includes(cleanedQuery)) return null;

      const exactName = normalizeAlias(entry.name) === cleanedQuery ? 3 : 0;
      const exactId = normalizeAlias(entry.id) === cleanedQuery ? 2 : 0;
      const prefix = normalizeAlias(entry.name).startsWith(cleanedQuery)
        ? 1
        : 0;

      return {
        entry,
        score: exactName + exactId + prefix,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.score - a.score || a.entry.name.localeCompare(b.entry.name)
    )
    .map((item) => item.entry);

  return ranked.slice(0, limit);
}

export function inferTechStackItemsFromRepos(
  repos = [],
  { maxPerCategory = {} } = {}
) {
  if (!Array.isArray(repos) || !repos.length) {
    return DEFAULT_STACK_IDS.map((id) =>
      normalizeTechItem({ id }, "frameworks")
    ).filter(Boolean);
  }

  const scoreMap = new Map();

  repos.forEach((repo) => {
    const language = normalizeAlias(repo?.language);
    const languageId = LANGUAGE_TO_TECH_ID[language];
    if (languageId) {
      addScore(scoreMap, languageId, 4);
    }

    const corpus = normalizeCorpus(repo);
    TECH_STACK_LIBRARY.forEach((entry) => {
      const matched = entry.aliases.some((alias) => aliasMatches(corpus, alias));
      if (matched) {
        addScore(scoreMap, entry.id, 1);
      }
    });

    inferHomePageTools(repo, scoreMap);
  });

  const limits = {
    ...categoryLimits,
    ...maxPerCategory,
  };

  const counters = TECH_STACK_CATEGORY_ORDER.reduce((result, category) => {
    result[category] = 0;
    return result;
  }, {});

  const sortedEntries = [...scoreMap.entries()]
    .sort((a, b) => {
      const scoreDiff = b[1] - a[1];
      if (scoreDiff !== 0) return scoreDiff;

      const aName = TECH_LIBRARY_BY_ID.get(a[0])?.name || "";
      const bName = TECH_LIBRARY_BY_ID.get(b[0])?.name || "";
      return aName.localeCompare(bName);
    })
    .map(([id]) => TECH_LIBRARY_BY_ID.get(id))
    .filter(Boolean);

  const inferred = [];
  sortedEntries.forEach((entry) => {
    const limit = limits[entry.category] || 12;
    if (counters[entry.category] >= limit) return;

    counters[entry.category] += 1;
    inferred.push({
      id: entry.id,
      name: entry.name,
      category: entry.category,
      iconId: entry.iconId,
      custom: false,
    });
  });

  const withCoverage = ensureCategoryCoverage(inferred);
  return withCoverage.length
    ? withCoverage
    : DEFAULT_STACK_IDS.map((id) =>
        normalizeTechItem({ id }, "frameworks")
      ).filter(Boolean);
}

export function inferTechStackDataFromRepos(repos = [], options = {}) {
  const inferredItems = inferTechStackItemsFromRepos(repos, options);
  return buildTechStackPayload({
    variant: DEFAULT_VARIANT,
    theme: DEFAULT_THEME,
    items: inferredItems,
  });
}
