const FALLBACK_SITE_URL = "https://githance.in";
const LEGACY_VERCEL_SITE_URL = "githance.vercel.app";

function normalizeSiteUrl(value) {
  const rawValue = String(value || "").trim();
  if (!rawValue) return "";

  const normalizedInput = /^https?:\/\//i.test(rawValue)
    ? rawValue
    : `${/^(localhost|127(?:\.\d{1,3}){3})/i.test(rawValue) ? "http" : "https"}://${rawValue}`;

  try {
    const parsed = new URL(normalizedInput);
    if (parsed.hostname.toLowerCase() === LEGACY_VERCEL_SITE_URL) {
      return FALLBACK_SITE_URL;
    }

    return parsed.origin.replace(/\/$/, "");
  } catch {
    return FALLBACK_SITE_URL;
  }
}

export const SITE_NAME = "GitHance";
export const SITE_URL =
  [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_BASE_URL,
    process.env.NEXTAUTH_URL,
    FALLBACK_SITE_URL,
  ]
    .map((value) => normalizeSiteUrl(value))
    .find(Boolean) || FALLBACK_SITE_URL;
export const SITE_DESCRIPTION =
  "GitHance helps developers generate GitHub READMEs, optimize profile READMEs, analyze repositories, compare developer profiles, and surface security issues from one AI-powered workspace.";
export const DEFAULT_OG_IMAGE = "/og/githance-og.png";

export const DEFAULT_KEYWORDS = [
  "GitHub README generator",
  "AI README generator",
  "GitHub profile README builder",
  "GitHub profile optimizer",
  "repository analyzer",
  "repository security analysis",
  "developer productivity tools",
  "developer portfolio tools",
  "README builder for developers",
  "GitHub tools",
  "developer workflow automation",
  "open source documentation tools",
];

const DEFAULT_ROBOTS = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

const NO_INDEX_ROBOTS = {
  index: false,
  follow: true,
  googleBot: {
    index: false,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

function dedupeKeywords(keywords = []) {
  return [...new Set([...DEFAULT_KEYWORDS, ...keywords].filter(Boolean))];
}

export function absoluteUrl(path = "/") {
  const normalizedPath = String(path || "/").startsWith("/")
    ? String(path || "/")
    : `/${String(path || "")}`;

  return `${SITE_URL}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function buildMetadata({
  title,
  description,
  path = "/",
  keywords = [],
  imagePath = DEFAULT_OG_IMAGE,
  imageAlt,
  type = "website",
  noIndex = false,
} = {}) {
  const resolvedTitle = title || SITE_NAME;
  const resolvedDescription = description || SITE_DESCRIPTION;
  const canonicalUrl = absoluteUrl(path);
  const socialImageUrl = absoluteUrl(imagePath);

  return {
    title: resolvedTitle,
    description: resolvedDescription,
    keywords: dedupeKeywords(keywords),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: resolvedTitle,
      description: resolvedDescription,
      url: canonicalUrl,
      siteName: SITE_NAME,
      type,
      locale: "en_US",
      images: [
        {
          url: socialImageUrl,
          alt: imageAlt || resolvedTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: resolvedTitle,
      description: resolvedDescription,
      images: [socialImageUrl],
    },
    robots: noIndex ? NO_INDEX_ROBOTS : DEFAULT_ROBOTS,
  };
}

export function createOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl("/favicon.ico"),
    description: SITE_DESCRIPTION,
  };
}

export function createWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: "en",
  };
}

export function createSoftwareApplicationSchema({
  name = SITE_NAME,
  description = SITE_DESCRIPTION,
  path = "/",
  featureList = [],
  keywords = [],
  offers,
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: absoluteUrl(path),
    description,
    keywords: dedupeKeywords(keywords).join(", "),
    featureList,
    offers,
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
  };
}

export function createFaqSchema(faqs = []) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function createBreadcrumbSchema(items = []) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function createHowToSchema({
  name,
  description,
  path,
  steps = [],
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    url: absoluteUrl(path),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.title,
      text: step.detail,
      url: `${absoluteUrl(path)}#step-${index + 1}`,
    })),
  };
}

export function createCollectionPageSchema({
  name,
  description,
  path,
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description,
    url: absoluteUrl(path),
  };
}

export function createItemListSchema({
  name,
  path,
  items = [],
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    url: absoluteUrl(path),
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      description: item.description,
      url: item.path ? absoluteUrl(item.path) : undefined,
    })),
  };
}

export function createArticleSchema({
  headline,
  description,
  path,
  datePublished,
  dateModified,
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    mainEntityOfPage: absoluteUrl(path),
    url: absoluteUrl(path),
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/favicon.ico"),
      },
    },
    datePublished,
    dateModified: dateModified || datePublished,
  };
}


export function createProductSchema({
  name,
  description,
  path,
  offers = [],
} = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url: absoluteUrl(path),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
    offers,
  };
}




