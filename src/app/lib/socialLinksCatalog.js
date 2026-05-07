const SOCIAL_ALIGNMENT_OPTIONS = ["left", "center", "right"];
const SOCIAL_LAYOUT_OPTIONS = ["straight", "grid"];

const RAW_SOCIAL_PLATFORM_ITEMS = [
  {
    id: "github",
    label: "GitHub",
    logo: "github",
    color: "181717",
    darkColor: "F0F6FC",
    placeholder: "github.com/your-username",
    aliases: ["gh"],
  },
  {
    id: "buymeacoffee",
    label: "Buy Me a Coffee",
    logo: "buymeacoffee",
    color: "FFDD00",
    darkColor: "FFDD00",
    placeholder: "buymeacoffee.com/your-name",
    aliases: ["bmc", "coffee", "support", "donation"],
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    logo: "linkedin",
    color: "0A66C2",
    placeholder: "linkedin.com/in/your-handle",
    aliases: ["linkedin profile"],
  },
  {
    id: "instagram",
    label: "Instagram",
    logo: "instagram",
    color: "E4405F",
    placeholder: "instagram.com/your-handle",
    aliases: ["insta"],
  },
  {
    id: "x",
    label: "X",
    logo: "x",
    color: "111111",
    darkColor: "F5F5F5",
    placeholder: "x.com/your-handle",
    aliases: ["twitter"],
  },
  {
    id: "youtube",
    label: "YouTube",
    logo: "youtube",
    color: "FF0000",
    placeholder: "youtube.com/@your-channel",
    aliases: ["yt"],
  },
  {
    id: "discord",
    label: "Discord",
    logo: "discord",
    color: "5865F2",
    placeholder: "discord.gg/your-invite",
    aliases: ["server"],
  },
  {
    id: "telegram",
    label: "Telegram",
    logo: "telegram",
    color: "26A5E4",
    placeholder: "t.me/your-handle",
    aliases: ["tg"],
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    logo: "whatsapp",
    color: "25D366",
    placeholder: "wa.me/your-number",
    aliases: ["wa"],
  },
  {
    id: "reddit",
    label: "Reddit",
    logo: "reddit",
    color: "FF4500",
    placeholder: "reddit.com/user/your-name",
    aliases: [],
  },
  {
    id: "bluesky",
    label: "Bluesky",
    logo: "bluesky",
    color: "0285FF",
    placeholder: "bsky.app/profile/your-handle",
    aliases: ["bsky"],
  },
  {
    id: "mastodon",
    label: "Mastodon",
    logo: "mastodon",
    color: "6364FF",
    placeholder: "mastodon.social/@your-handle",
    aliases: [],
  },
  {
    id: "medium",
    label: "Medium",
    logo: "medium",
    color: "12100E",
    darkColor: "F5F5F5",
    placeholder: "medium.com/@your-handle",
    aliases: [],
  },
  {
    id: "devto",
    label: "Dev.to",
    logo: "devdotto",
    color: "0A0A0A",
    darkColor: "F5F5F5",
    placeholder: "dev.to/your-handle",
    aliases: ["dev"],
  },
  {
    id: "twitch",
    label: "Twitch",
    logo: "twitch",
    color: "9146FF",
    placeholder: "twitch.tv/your-handle",
    aliases: [],
  },
  {
    id: "facebook",
    label: "Facebook",
    logo: "facebook",
    color: "1877F2",
    placeholder: "facebook.com/your-page",
    aliases: ["fb"],
  },
  {
    id: "threads",
    label: "Threads",
    logo: "threads",
    color: "101010",
    darkColor: "F5F5F5",
    placeholder: "threads.net/@your-handle",
    aliases: [],
  },
  {
    id: "tiktok",
    label: "TikTok",
    logo: "tiktok",
    color: "111111",
    darkColor: "F5F5F5",
    placeholder: "tiktok.com/@your-handle",
    aliases: [],
  },
  {
    id: "pinterest",
    label: "Pinterest",
    logo: "pinterest",
    color: "BD081C",
    placeholder: "pinterest.com/your-handle",
    aliases: [],
  },
  {
    id: "snapchat",
    label: "Snapchat",
    logo: "snapchat",
    color: "FFFC00",
    placeholder: "snapchat.com/add/your-handle",
    aliases: [],
  },
  {
    id: "behance",
    label: "Behance",
    logo: "behance",
    color: "1769FF",
    placeholder: "behance.net/your-handle",
    aliases: [],
  },
  {
    id: "dribbble",
    label: "Dribbble",
    logo: "dribbble",
    color: "EA4C89",
    placeholder: "dribbble.com/your-handle",
    aliases: [],
  },
  {
    id: "gitlab",
    label: "GitLab",
    logo: "gitlab",
    color: "FC6D26",
    placeholder: "gitlab.com/your-username",
    aliases: [],
  },
  {
    id: "stackoverflow",
    label: "Stack Overflow",
    logo: "stackoverflow",
    color: "F58025",
    placeholder: "stackoverflow.com/users/your-id",
    aliases: ["stack overflow", "so"],
  },
  {
    id: "spotify",
    label: "Spotify",
    logo: "spotify",
    color: "1ED760",
    placeholder: "open.spotify.com/user/your-name",
    aliases: [],
  },
];

const buildIconUrl = (logo, color) =>
  `https://api.iconify.design/simple-icons:${encodeURIComponent(String(logo || "").trim())}.svg?color=%23${String(
    color || "111111"
  )
    .trim()
    .replace(/^#/, "")}`;

const cleanSocialHandle = (value) =>
  String(value || "")
    .trim()
    .replace(/^[\/]+/, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "");

const ensureAbsoluteUrl = (value) => {
  let normalized = String(value || "").trim();
  if (!normalized) return "";

  if (
    !/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(normalized) &&
    !normalized.startsWith("mailto:")
  ) {
    normalized = `https://${normalized.replace(/^\/+/, "")}`;
  }

  try {
    return new URL(normalized).toString();
  } catch {
    return normalized;
  }
};

function buildPlatformSocialUrl(platformId, rawValue) {
  const value = String(rawValue || "").trim();
  if (!value) return "";

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(value) || value.startsWith("mailto:")) {
    return ensureAbsoluteUrl(value);
  }

  const safeValue = value.replace(/^\/+/, "");
  const lowerValue = safeValue.toLowerCase();

  if (lowerValue.includes(".")) {
    if (platformId === "linkedin" && lowerValue.startsWith("linkedin.com/")) {
      return ensureAbsoluteUrl(`https://www.${safeValue}`);
    }

    return ensureAbsoluteUrl(safeValue);
  }

  const handle = cleanSocialHandle(safeValue);
  if (!handle) return "";

  switch (platformId) {
    case "github":
      return `https://github.com/${handle}`;
    case "buymeacoffee":
      return `https://www.buymeacoffee.com/${handle}`;
    case "linkedin": {
      if (/^(in|company|school|showcase)\//i.test(safeValue)) {
        return ensureAbsoluteUrl(`https://www.linkedin.com/${safeValue}`);
      }
      return `https://www.linkedin.com/in/${handle}/`;
    }
    case "instagram":
      return `https://www.instagram.com/${handle}/`;
    case "x":
      return `https://x.com/${handle}`;
    case "youtube":
      return handle.startsWith("@")
        ? `https://www.youtube.com/${handle}`
        : `https://www.youtube.com/@${handle}`;
    case "telegram":
      return `https://t.me/${handle}`;
    case "whatsapp":
      return `https://wa.me/${handle.replace(/\D+/g, "")}`;
    case "reddit":
      return /^u\//i.test(safeValue)
        ? `https://www.reddit.com/user/${handle.slice(2)}`
        : `https://www.reddit.com/user/${handle}`;
    case "bluesky":
      return `https://bsky.app/profile/${handle}`;
    case "medium":
      return handle.startsWith("@")
        ? `https://medium.com/${handle}`
        : `https://medium.com/@${handle}`;
    case "devto":
      return `https://dev.to/${handle}`;
    case "twitch":
      return `https://www.twitch.tv/${handle}`;
    case "facebook":
      return `https://www.facebook.com/${handle}`;
    case "threads":
      return handle.startsWith("@")
        ? `https://www.threads.net/${handle}`
        : `https://www.threads.net/@${handle}`;
    case "tiktok":
      return handle.startsWith("@")
        ? `https://www.tiktok.com/${handle}`
        : `https://www.tiktok.com/@${handle}`;
    case "pinterest":
      return `https://www.pinterest.com/${handle}`;
    case "snapchat":
      return `https://www.snapchat.com/add/${handle}`;
    case "behance":
      return `https://www.behance.net/${handle}`;
    case "dribbble":
      return `https://dribbble.com/${handle}`;
    case "gitlab":
      return `https://gitlab.com/${handle}`;
    case "stackoverflow":
      return `https://stackoverflow.com/users/${handle}`;
    case "spotify":
      return `https://open.spotify.com/user/${handle}`;
    default:
      return ensureAbsoluteUrl(safeValue);
  }
}

export const SOCIAL_LINK_ALIGNMENTS = [...SOCIAL_ALIGNMENT_OPTIONS];
export const SOCIAL_LINK_LAYOUTS = [...SOCIAL_LAYOUT_OPTIONS];

export const SOCIAL_PLATFORM_ITEMS = RAW_SOCIAL_PLATFORM_ITEMS.map((entry) => ({
  ...entry,
  iconUrl: buildIconUrl(entry.logo, entry.color),
  darkIconUrl: buildIconUrl(entry.logo, entry.darkColor || entry.color),
}));

const SOCIAL_PLATFORM_BY_ID = new Map(
  SOCIAL_PLATFORM_ITEMS.map((entry) => [entry.id, entry])
);

export function normalizeSocialAlignment(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SOCIAL_ALIGNMENT_OPTIONS.includes(normalized) ? normalized : "center";
}

export function normalizeSocialLayout(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SOCIAL_LAYOUT_OPTIONS.includes(normalized) ? normalized : "straight";
}

export function normalizeSocialPlatformId(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (SOCIAL_PLATFORM_BY_ID.has(normalized)) {
    return normalized;
  }

  return "";
}

export function getSocialPlatformById(value) {
  const normalized = normalizeSocialPlatformId(value);
  return normalized ? SOCIAL_PLATFORM_BY_ID.get(normalized) || null : null;
}

export function normalizeSocialUrl(value, platformId = "") {
  const normalizedPlatformId = normalizeSocialPlatformId(platformId);
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";

  if (normalizedPlatformId) {
    return buildPlatformSocialUrl(normalizedPlatformId, normalizedValue);
  }

  return ensureAbsoluteUrl(normalizedValue);
}

export function normalizeSocialLinksData(data = {}, options = {}) {
  const includeDefaults = options?.includeDefaults !== false;
  const fallbackTitle = includeDefaults ? "Connect With Me" : "";
  const title = String(data?.title || fallbackTitle).trim() || fallbackTitle;
  const alignment = normalizeSocialAlignment(data?.alignment);
  const layout = normalizeSocialLayout(data?.layout || data?.variant);
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.links)
      ? data.links
      : [];
  const items = [];
  const seen = new Set();

  rawItems.forEach((entry) => {
    const platform = getSocialPlatformById(
      entry?.platformId || entry?.platform || entry?.id || entry?.key
    );
    if (!platform?.id || seen.has(platform.id)) {
      return;
    }

    seen.add(platform.id);
    items.push({
      platformId: platform.id,
      url: normalizeSocialUrl(entry?.url || entry?.href || entry?.link || "", platform.id),
    });
  });

  return {
    title,
    alignment,
    layout,
    items,
  };
}

export function buildSocialLinksPayload(data = {}) {
  return normalizeSocialLinksData(data, { includeDefaults: true });
}

export function searchSocialPlatforms(query, options = {}) {
  const normalizedQuery = String(query || "").trim().toLowerCase();
  const limit = Math.max(1, Number(options?.limit || 24));

  if (!normalizedQuery) {
    return SOCIAL_PLATFORM_ITEMS.slice(0, limit);
  }

  return SOCIAL_PLATFORM_ITEMS.filter((entry) => {
    const haystack = [entry.id, entry.label, ...(entry.aliases || [])]
      .join(" ")
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  }).slice(0, limit);
}
