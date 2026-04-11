import { buildRenderUrl, buildTrophyUrl } from "./generateBlockSvg";
import {
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  getTechCatalogItem,
  getTechIconUrl,
  normalizeTechStackData,
} from "./techStackCatalog";
import { getRepoCommitStatItemById } from "./repoCommitCatalog";
import { getSectionVariantById } from "./sectionCatalog";
import { resolveProfileBuilderUsername } from "./profileComponents";
import {
  getSocialPlatformById,
  normalizeSocialLinksData,
} from "./socialLinksCatalog";
import { normalizeStickerAssignments, normalizeStickerLayers } from "./stickerCatalog";
import {
  getGraphicComponentVariantById,
  normalizeGraphicComponentData,
} from "./graphicComponentCatalog";
import { buildFooterBannerRenderPath, getFooterBannerById } from "./footerBannerCatalog";

const REPO_COMMIT_MARKDOWN_WIDTH = 360;
const FOOTER_BANNER_MARKDOWN_WIDTH = 800;

const escapeHtmlAttribute = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const resolveAbsoluteAssetUrl = (baseUrl, assetValue) => {
  const rawValue =
    typeof assetValue === "string" ? assetValue : String(assetValue?.src || "");
  const normalized = String(rawValue || "").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const origin = String(baseUrl || "").replace(/\/$/, "");
  if (!origin) return normalized;

  return normalized.startsWith("/") ? `${origin}${normalized}` : `${origin}/${normalized}`;
};

const encodeStickersParam = (value) => {
  const normalized = normalizeStickerAssignments(value);
  if (!Object.keys(normalized).length) return "";

  try {
    return JSON.stringify(normalized);
  } catch {
    return "";
  }
};

const encodeStickerLayersParam = (value) => {
  const normalized = normalizeStickerLayers(value);
  if (!normalized.length) return "";

  try {
    return JSON.stringify(normalized);
  } catch {
    return "";
  }
};

const encodeStatsSnapshotParam = (value) => {
  if (!value || typeof value !== "object") return "";

  try {
    return encodeURIComponent(
      JSON.stringify({
        github_username: String(value.github_username || ""),
        total_commits: Number(value.total_commits || 0),
        current_streak: Number(value.current_streak || 0),
        longest_streak: Number(value.longest_streak || 0),
        last_repo: String(value.last_repo || ""),
        active_days_30: Number(value.active_days_30 || 0),
        active_days_90: Number(value.active_days_90 || 0),
        top_repo_recent: String(value.top_repo_recent || ""),
        recent_commits_7: Number(value.recent_commits_7 || 0),
        recent_commits_30: Number(value.recent_commits_30 || 0),
        last_updated: String(value.last_updated || ""),
        installation_id: Number(value.installation_id || 0) || null,
      })
    );
  } catch {
    return "";
  }
};

const TECH_SHIELDS_BADGE_BACKGROUND = "111827";
const TECH_STACK_INLINE_ITEM_STYLE = "margin-right: 10px; margin-bottom: 8px;";
const TECH_STACK_SHIELDS_META = {
  c: { logo: "c", color: "A8B9CC" },
  cplusplus: { logo: "cplusplus", color: "00599C" },
  javascript: { logo: "javascript", color: "F7DF1E" },
  typescript: { logo: "typescript", color: "3178C6" },
  html: { logo: "html5", color: "E34F26" },
  css: { logo: "css", color: "1572B6" },
  kotlin: { logo: "kotlin", color: "7F52FF" },
  python: { logo: "python", color: "3776AB" },
  dart: { logo: "dart", color: "0175C2" },
  go: { logo: "go", color: "00ADD8" },
  rust: { logo: "rust", color: "FFFFFF" },
  php: { logo: "php", color: "777BB4" },
  ruby: { logo: "ruby", color: "CC342D" },
  swift: { logo: "swift", color: "FA7343" },
  scala: { logo: "scala", color: "DC322F" },
  r: { logo: "r", color: "276DC3" },
  elixir: { logo: "elixir", color: "4B275F" },
  react: { logo: "react", color: "61DAFB" },
  nextjs: { logo: "nextdotjs", color: "FFFFFF" },
  vue: { logo: "vuedotjs", color: "4FC08D" },
  nuxtjs: { logo: "nuxt", color: "00DC82" },
  angular: { logo: "angular", color: "DD0031" },
  svelte: { logo: "svelte", color: "FF3E00" },
  flutter: { logo: "flutter", color: "02569B" },
  spring: { logo: "springboot", color: "6DB33F" },
  nodejs: { logo: "nodedotjs", color: "5FA04E" },
  express: { logo: "express", color: "FFFFFF" },
  nestjs: { logo: "nestjs", color: "E0234E" },
  django: { logo: "django", color: "092E20" },
  flask: { logo: "flask", color: "FFFFFF" },
  fastapi: { logo: "fastapi", color: "009688" },
  laravel: { logo: "laravel", color: "FF2D20" },
  rails: { logo: "rubyonrails", color: "D30001" },
  dotnet: { logo: "dotnet", color: "512BD4" },
  tensorflow: { logo: "tensorflow", color: "FF6F00" },
  pytorch: { logo: "pytorch", color: "EE4C2C" },
  vite: { logo: "vite", color: "646CFF" },
  tailwindcss: { logo: "tailwindcss", color: "06B6D4" },
  bootstrap: { logo: "bootstrap", color: "7952B3" },
  graphql: { logo: "graphql", color: "E10098" },
  redux: { logo: "redux", color: "764ABC" },
  jquery: { logo: "jquery", color: "0769AD" },
  threejs: { logo: "threedotjs", color: "FFFFFF" },
  git: { logo: "git", color: "F05032" },
  github: { logo: "github", color: "FFFFFF" },
  gitlab: { logo: "gitlab", color: "FC6D26" },
  docker: { logo: "docker", color: "2496ED" },
  kubernetes: { logo: "kubernetes", color: "326CE5" },
  terraform: { logo: "terraform", color: "844FBA" },
  gcp: { logo: "googlecloud", color: "4285F4" },
  vercel: { logo: "vercel", color: "FFFFFF" },
  netlify: { logo: "netlify", color: "00C7B7" },
  linux: { logo: "linux", color: "FCC624" },
  ubuntu: { logo: "ubuntu", color: "E95420" },
  intellij: { logo: "intellijidea", color: "FFFFFF" },
  webstorm: { logo: "webstorm", color: "FFFFFF" },
  pycharm: { logo: "pycharm", color: "FFFFFF" },
  androidstudio: { logo: "androidstudio", color: "3DDC84" },
  postman: { logo: "postman", color: "FF6C37" },
  npm: { logo: "npm", color: "CB3837" },
  yarn: { logo: "yarn", color: "2C8EBB" },
  pnpm: { logo: "pnpm", color: "F69220" },
  figma: { logo: "figma", color: "F24E1E" },
  jira: { logo: "jira", color: "0052CC" },
  mongodb: { logo: "mongodb", color: "47A248" },
  mysql: { logo: "mysql", color: "4479A1" },
  postgresql: { logo: "postgresql", color: "4169E1" },
  redis: { logo: "redis", color: "DC382D" },
  sqlite: { logo: "sqlite", color: "003B57" },
  firebase: { logo: "firebase", color: "FFCA28" },
  supabase: { logo: "supabase", color: "3ECF8E" },
  prisma: { logo: "prisma", color: "FFFFFF" },
  mariadb: { logo: "mariadb", color: "003545" },
};

const buildTechBadgeUrl = (name, meta = null) => {
  const label = encodeURIComponent(String(name || "Tech").trim() || "Tech");
  const search = new URLSearchParams({
    style: "for-the-badge",
  });

  if (meta?.logo) {
    search.set("logo", meta.logo);
  }

  const logoColor = String(meta?.logoColor || meta?.color || "")
    .trim()
    .replace(/^#/, "");
  if (logoColor) {
    search.set("logoColor", logoColor);
  }

  return `https://img.shields.io/badge/${label}-${TECH_SHIELDS_BADGE_BACKGROUND}?${search.toString()}`;
};

const buildTechStackItemMarkup = (
  tech,
  { useShields = false, withSpacing = true } = {}
) => {
  const safeName = escapeHtmlAttribute(tech?.name);
  const styleAttr = withSpacing ? ` style="${TECH_STACK_INLINE_ITEM_STYLE}"` : "";

  if (useShields) {
    const catalog = getTechCatalogItem(tech?.id || tech?.name);
    const badgeMeta = TECH_STACK_SHIELDS_META[catalog?.id || tech?.id] || null;
    const badgeUrl = buildTechBadgeUrl(tech?.name || catalog?.name, badgeMeta);
    return `<img src="${badgeUrl}" alt="${safeName}"${styleAttr} />`;
  }

  const iconUrl = getTechIconUrl(tech);
  if (iconUrl) {
    return `<img src="${iconUrl}" alt="${safeName}" width="44" height="44"${styleAttr} />`;
  }

  if (!withSpacing) {
    return `<sub>${safeName}</sub>`;
  }

  return `<img src="${buildTechBadgeUrl(tech?.name)}" alt="${safeName}"${styleAttr} />`;
};
export function buildTechStackMarkdownSection(itemData = {}, options = {}) {
  const {
    includeHeading = true,
    baseUrl = "",
  } = options;

  const normalizedStack = normalizeTechStackData(itemData || {});
  const normalizedVariant = String(normalizedStack.variant || "").trim().toLowerCase();
  const useShields = normalizedVariant === "shields";
  const alignment = ["left", "center", "right"].includes(
    String(normalizedStack.alignment || "").toLowerCase()
  )
    ? String(normalizedStack.alignment || "").toLowerCase()
    : "left";
  const layout =
    String(normalizedStack.layout || "categorized").trim().toLowerCase() ===
    "square-grid"
      ? "square-grid"
      : "categorized";

  if (normalizedStack.items.length) {
    if (layout === "square-grid") {
      const columnCount = useShields
        ? Math.min(4, Math.max(1, Math.ceil(Math.sqrt(normalizedStack.items.length))))
        : Math.max(2, Math.ceil(Math.sqrt(normalizedStack.items.length)));
      const cellWidth = useShields ? 180 : 84;
      const cellHeight = useShields ? 52 : 84;
      const iconCells = normalizedStack.items.map(
        (tech) =>
          `<td align="center" valign="middle" width="${cellWidth}" height="${cellHeight}">${buildTechStackItemMarkup(
            tech,
            { useShields, withSpacing: false }
          )}</td>`
      );
      const rows = [];

      for (let index = 0; index < iconCells.length; index += columnCount) {
        const chunk = iconCells.slice(index, index + columnCount);
        const paddedChunk =
          chunk.length >= columnCount
            ? chunk
            : [
                ...chunk,
                ...Array.from({ length: columnCount - chunk.length }, () =>
                  `<td align="center" valign="middle" width="${cellWidth}" height="${cellHeight}">&nbsp;</td>`
                ),
              ];

        rows.push(`  <tr>\n${paddedChunk.join("\n")}\n  </tr>`);
      }

      const body = `<div align="${alignment}">\n<table cellpadding="${useShields ? 10 : 8}" cellspacing="0">\n${rows.join("\n")}\n</table>\n</div>`;
      if (!includeHeading) {
        return body;
      }

      return `## Tech Stack

${body}`;
    }

    const sections = TECH_STACK_CATEGORY_ORDER.map((category) => {
      const categoryItems = normalizedStack[category] || [];
      if (!categoryItems.length) return "";

      const icons = categoryItems
        .map((tech) => `  ${buildTechStackItemMarkup(tech, { useShields })}`)
        .join("\n");

      return `### ${TECH_STACK_CATEGORY_LABELS[category]}:\n\n<p align="${alignment}">\n${icons}\n</p>`;
    })
      .filter(Boolean)
      .join("\n\n");

    if (!sections) return "";
    if (!includeHeading) return sections;

    return `## Tech Stack

${sections}`;
  }

  const variant = itemData?.variant || "grid";
  const url = buildRenderUrl({
    baseUrl,
    type: "stack",
    variant,
    params: {
      theme: "midnight",
      s: itemData?.stack || [],
    },
  });

  if (!includeHeading) {
    return `<div align="${alignment}">
  <img src="${url}" alt="Tech Stack" />
</div>`;
  }

  return `## Tech Stack

<div align="${alignment}">
  <img src="${url}" alt="Tech Stack" />
</div>`;
}
export function buildGraphicComponentMarkdownSection(itemData = {}, options = {}) {
  const { baseUrl = "" } = options;
  const normalized = normalizeGraphicComponentData(itemData || {});
  const alignment = ["left", "center", "right"].includes(
    String(normalized.alignment || "").toLowerCase()
  )
    ? String(normalized.alignment || "").toLowerCase()
    : "center";
  const variant = getGraphicComponentVariantById(normalized.variant);
  const url = buildRenderUrl({
    baseUrl,
    type: "decor",
    variant: normalized.variant,
    params: {
      pc: normalized.primaryColor,
      sc: normalized.secondaryColor,
      ac: normalized.accentColor,
      t: normalized.thickness,
      align: normalized.alignment,
      span: normalized.lineWidth,
    },
  });

  return `<p align="${alignment}">
  <img src="${url}" alt="${escapeHtmlAttribute(variant?.title || "Graphic component")}" />
</p>`;
}
export function buildSocialLinksMarkdownSection(itemData = {}, options = {}) {
  const { includeHeading = true, darkSurface = false } = options;
  const normalized = normalizeSocialLinksData(itemData || {}, {
    includeDefaults: true,
  });
  const title = String(normalized.title || "Connect With Me").trim() || "Connect With Me";
  const alignment = ["left", "center", "right"].includes(
    String(normalized.alignment || "").toLowerCase()
  )
    ? String(normalized.alignment || "").toLowerCase()
    : "center";
  const layout = String(normalized.layout || "straight").trim().toLowerCase() === "grid"
    ? "grid"
    : "straight";
  const icons = normalized.items
    .map((entry) => {
      const platform = getSocialPlatformById(entry?.platformId);
      const href = String(entry?.url || "").trim();
      if (!platform?.iconUrl || !href) return "";

      const safeHref = escapeHtmlAttribute(href);
      const safeLabel = escapeHtmlAttribute(platform.label);
      const iconSource = darkSurface ? platform.darkIconUrl || platform.iconUrl : platform.iconUrl;
      const safeIcon = escapeHtmlAttribute(iconSource);
      return `<a href="${safeHref}"><img src="${safeIcon}" alt="${safeLabel}" width="34" height="34" /></a>`;
    })
    .filter(Boolean);

  if (!icons.length) {
    return "";
  }

  const body =
    layout === "grid"
      ? (() => {
          const columnCount = Math.max(1, Math.ceil(Math.sqrt(icons.length)));
          const rowChunks = [];

          for (let index = 0; index < icons.length; index += columnCount) {
            rowChunks.push(icons.slice(index, index + columnCount));
          }

          const rows = rowChunks
            .map((chunk) => {
              const paddedChunk =
                chunk.length >= columnCount
                  ? chunk
                  : [...chunk, ...Array.from({ length: columnCount - chunk.length }, () => "&nbsp;")];
              const cells = paddedChunk
                .map(
                  (icon) => `<td align="center" valign="middle" width="52">${icon}</td>`
                )
                .join("\n");

              return `  <tr>\n${cells}\n  </tr>`;
            })
            .join("\n");

          return `<div align="${alignment}">\n<table cellpadding="8" cellspacing="0">\n${rows}\n</table>\n</div>`;
        })()
      : `<p align="${alignment}">\n  ${icons.join("&nbsp;&nbsp;\n  ")}\n</p>`;

  if (!includeHeading) {
    return body;
  }

  return `## ${title}

${body}`;
}

export default function generateMarkdown(canvasItems, options = {}) {
  let markdown = "";
  const suppressRepoCommitHeading = Boolean(options?.suppressRepoCommitHeading);
  const embedStatsSnapshots = Boolean(options?.embedStatsSnapshots);
  let hasRepoCommitHeading = suppressRepoCommitHeading;

  const resolveBaseUrl = () => {
    const envUrl = String(process.env.NEXT_PUBLIC_APP_URL || "").trim();
    if (envUrl) {
      const normalizedEnvUrl = envUrl.replace(/\/$/, "");
      if (/^https?:\/\/githance\.vercel\.app$/i.test(normalizedEnvUrl)) {
        return "https://githance.in";
      }
      return normalizedEnvUrl;
    }

    if (typeof window !== "undefined") {
      const origin = window.location.origin.replace(/\/$/, "");
      if (/^https?:\/\/githance\.vercel\.app$/i.test(origin)) {
        return "https://githance.in";
      }
      return origin;
    }

    return "https://githance.in";
  };

  canvasItems.forEach((item) => {
    if (!item.id) return;

    const block = item.id.split("-")[1];

    if (block === "header" && item.variant === "typingHeader") {
      markdown += `
<div align="center">
  <img src="https://readme-typing-svg.demolab.com/?lines=Hi%20there,%20I%27m%20Abhishek!;Top+10+GitHub+Committer+in+India;Top+10+LeetCoder+in+India&font=Fira%20Code&center=true&width=640&height=45&color=ff79c6&vCenter=true&pause=1000&size=30" />
</div>

`;
    }

    if (block === "header" && item.variant === "image") {
      markdown += `
<div align="center">
  <img src="https://ghchart.rshah.org/abhishek5127" alt="contribution Graph Image" />
</div>

`;
    }

    if (block === "header" && item.variant === "simple") {
      const title = encodeURIComponent(item.data?.text || "");
      const subtitle = encodeURIComponent(item.data?.subText || "");

      const cleanColor = item.data?.color?.replace("#", "") || "238636";
      const cleanSubColor = item.data?.subcolor?.replace("#", "") || "3c3c3c";

      markdown += `
<div align="center">

![${item.data?.text || ""}](https://img.shields.io/badge/${title}-cfe8ff?style=for-the-badge&labelColor=cfe8ff&color=${cleanColor})

![${item.data?.subText || ""}](https://img.shields.io/badge/${subtitle}-cfe8ff?style=for-the-badge&labelColor=${cleanColor}&color=${cleanSubColor})

</div>

`;
    }

    if (block === "header" && item.variant === "signature") {
      const name = encodeURIComponent(item.data?.signatureName || "Your Name");
      const role = encodeURIComponent(item.data?.signatureRole || "Design + Code");
      const theme = encodeURIComponent(item.data?.signatureTheme || "gradient");

      markdown += `
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=${theme}&height=160&section=header&text=${name}&fontSize=38&fontAlignY=35&desc=${role}&descAlignY=60" />
</div>

`;
    }

    if (block === "header" && item.variant === "achievement") {
      const name = encodeURIComponent(item.data?.achievementName || "Your Name");
      const role = encodeURIComponent(item.data?.achievementRole || "Creative Developer");
      const accent = encodeURIComponent((item.data?.achievementAccent || "#ff7a1a").replace("#", ""));
      const achievements = (item.data?.achievementList || [])
        .filter(Boolean)
        .map((text) => encodeURIComponent(text));

      const lines = [name, role, ...achievements].join(";");

      markdown += `
<div align="center">
  <img src="https://readme-typing-svg.demolab.com/?lines=${lines}&font=Fira%20Code&center=true&width=700&height=50&color=${accent}&vCenter=true&pause=900&size=28" />
</div>

`;
    }

    if (block === "header" && item.variant === "trophy") {
      const baseUrl = resolveBaseUrl();
      const url = buildTrophyUrl({
        baseUrl,
        title: item.data?.trophyTitle || "Highlights",
        achievements: item.data?.trophyList || [],
        columns: item.data?.trophyColumns || 4,
        theme: item.data?.trophyTheme || "midnight",
      });

      markdown += `
<div align="center">
  <img src="${url}" alt="Achievements showcase" />
</div>

`;
    }

    if (
      block === "header" &&
      ["constellation", "signal", "terminal", "stacked", "circuit", "blueprint", "spotlight", "executive", "briefing", "glass", "ledger", "summit", "marquee", "panorama"].includes(item.variant)
    ) {
      const baseUrl = resolveBaseUrl();
      const url = buildRenderUrl({
        baseUrl,
        type: "header",
        variant: item.variant,
        params: {
          name: item.data?.customName || "Your Name",
          subtitle: item.data?.customSubtitle || "Building thoughtful software",
          theme: item.data?.customTheme || "midnight",
          a: item.data?.customAccents || [],
        },
      });

      markdown += `
<div align="center">
  <img src="${url}" alt="Custom header" />
</div>

`;
    }

    if (block === "bio") {
      const bioData = item.data || {};
      const hasExplicitContent = Object.prototype.hasOwnProperty.call(bioData, "content");
      const content = hasExplicitContent ? String(bioData.content ?? "").trim() : "";

      if (hasExplicitContent) {
        if (content) {
          markdown += `
${content}

`;
        }
      } else {
        const title = (bioData.title || "About Me").trim();
        const summary = (bioData.summary || "").trim();
        const focus = (bioData.focus || [])
          .map((point) => String(point || "").trim())
          .filter(Boolean);

        markdown += `
## ${title}

${summary}

${focus.length ? `${focus.map((point) => `- ${point}`).join("\n")}` : ""}

`;
      }
    }

    if (block === "skills") {
      const techStackSection = buildTechStackMarkdownSection(item.data || {}, {
        includeHeading: true,
        baseUrl: resolveBaseUrl(),
      });
      if (techStackSection) {
        markdown += `
${techStackSection}

`;
      }
    }

    if (block === "social") {
      const socialSection = buildSocialLinksMarkdownSection(item.data || {}, {
        includeHeading: true,
      });
      if (socialSection) {
        markdown += `
${socialSection}

`;
      }
    }

    if (item.type === "graphic" || block === "graphic") {
      const graphicSection = buildGraphicComponentMarkdownSection(item.data || {}, {
        baseUrl: resolveBaseUrl(),
      });
      if (graphicSection) {
        markdown += `
${graphicSection}

`;
      }
    }

    if (item.type === "section" || block === "section") {
      const variant = getSectionVariantById(item?.data?.variantId);
      const supportsBorderToggle = variant?.supportsBorderToggle !== false;
      const showBorders =
        supportsBorderToggle ? item?.data?.showBorders !== false : true;
      const rawSlots = Array.isArray(item?.data?.slots) ? item.data.slots : [];
      const resolvedSlots =
        rawSlots.length >= variant.slotCount
          ? rawSlots.slice(0, variant.slotCount)
          : [
              ...rawSlots,
              ...Array.from(
                { length: Number(variant.slotCount || 0) - rawSlots.length },
                () => null
              ),
            ];

      const slotMarkdown = resolvedSlots.map((slotItem) => {
        if (!slotItem || slotItem.type === "section") return "";
        return generateMarkdown([slotItem], {
          suppressRepoCommitHeading: true,
          embedStatsSnapshots,
        }).trim();
      });

      if (variant.markdownLayout === "table") {
        const columns = Math.max(1, Number(variant.markdownColumns || variant.canvasColumns || 1));
        const rowChunks = [];
        for (let index = 0; index < slotMarkdown.length; index += columns) {
          rowChunks.push(slotMarkdown.slice(index, index + columns));
        }

        const tableAttrs =
          !showBorders && supportsBorderToggle
            ? ' border="0" cellpadding="0" cellspacing="0" style="border: 0; border-collapse: separate;"'
            : "";
        const rowAttrs = !showBorders && supportsBorderToggle ? ' style="border: 0;"' : "";
        const cellAttrs =
          !showBorders && supportsBorderToggle
            ? ' style="border: 0; padding: 0 8px;"'
            : "";

        const rows = rowChunks
          .map((chunk) => {
            const cells = chunk
              .map(
                (content) => `<td align="center" valign="top"${cellAttrs}>
${content || "&nbsp;"}
</td>`
              )
              .join("\n");

            return `  <tr${rowAttrs}>
${cells}
  </tr>`;
          })
          .join("\n");

        markdown += `
<table${tableAttrs}>
${rows}
</table>

`;
      } else {
        markdown += `${slotMarkdown
          .map(
            (content) => `<div align="center">
${content || "&nbsp;"}
</div>`
          )
          .join("\n\n")}

`;
      }

      return;
    }

    if (item.type === "commitStat" || block === "commitstat") {
      const baseUrl = resolveBaseUrl();
      const username = resolveProfileBuilderUsername(item.data?.username);
      const installationId = Number(item.data?.installationId || 0) || null;
      const statId = String(item.data?.statId || "contribution")
        .trim()
        .toLowerCase();
      const selectedStat = getRepoCommitStatItemById(statId);
      const stickersParam = encodeStickersParam(item?.data?.stickers);
      const statsSnapshotParam = embedStatsSnapshots ? encodeStatsSnapshotParam(item?.data?.statsSnapshot) : "";

      if (username && selectedStat) {
        const statUrl = buildRenderUrl({
          baseUrl,
          type: selectedStat.type,
          variant:
            selectedStat.type === "contribution"
              ? "summary"
              : selectedStat.type === "streak"
                ? "default"
                : "metric",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            ...(selectedStat.metric ? { metric: selectedStat.metric } : {}),
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });

        if (!hasRepoCommitHeading) {
          markdown += `
## Repo Commit Stats

`;
          hasRepoCommitHeading = true;
        }

        markdown += `
<p align="center">
  <img src="${statUrl}" alt="${selectedStat.alt}" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
</p>

`;
      }

      return;
    }

    if (block === "commits") {
      const baseUrl = resolveBaseUrl();
      const username = resolveProfileBuilderUsername(item.data?.username);
      const installationId = Number(item.data?.installationId || 0) || null;
      const stickersParam = encodeStickersParam(item?.data?.stickers);
      const statsSnapshotParam = embedStatsSnapshots ? encodeStatsSnapshotParam(item?.data?.statsSnapshot) : "";

      if (username) {
        const contributionUrl = buildRenderUrl({
          baseUrl,
          type: "contribution",
          variant: "summary",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });
        const streakUrl = buildRenderUrl({
          baseUrl,
          type: "streak",
          variant: "default",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });
        const lastRepoUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            metric: "last_repo",
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });
        const totalCommitsUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            metric: "total_commits",
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });
        const activeDaysUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            metric: "active_days",
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });
        const topRepoUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
            metric: "top_repo",
            ...(statsSnapshotParam ? { snapshot: statsSnapshotParam, prefer_snapshot: "1" } : {}),
            ...(stickersParam ? { stickers: stickersParam } : {}),
          },
        });

        if (!hasRepoCommitHeading) {
          markdown += `
## Repo Commit Stats

`;
          hasRepoCommitHeading = true;
        }

        markdown += `
<p align="center">
  <img src="${contributionUrl}" alt="Contribution summary" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
  <img src="${streakUrl}" alt="Commit streak" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
</p>

<p align="center">
  <img src="${lastRepoUrl}" alt="Last worked repository" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
  <img src="${totalCommitsUrl}" alt="Total commits" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
</p>

<p align="center">
  <img src="${activeDaysUrl}" alt="Active days in 30 and 90 day windows" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
  <img src="${topRepoUrl}" alt="Top repository by recent activity" width="${REPO_COMMIT_MARKDOWN_WIDTH}" />
</p>

`;
      }
    }

    if (block === "contribution") {
      const baseUrl = resolveBaseUrl();
      const username = resolveProfileBuilderUsername(item.data?.username);
      const stickersParam = encodeStickersParam(item?.data?.stickers);
      const stickerLayersParam = encodeStickerLayersParam(item?.data?.stickerLayers);

      if (!username) return;

      const contributionUrl = buildRenderUrl({
        baseUrl,
        type: "contribution-heatmap",
        variant: item?.data?.variant || "classic",
        params: {
          user: username,
          range: item?.data?.range || "yearly",
          ...(stickersParam ? { stickers: stickersParam } : {}),
          ...(stickerLayersParam ? { layers: stickerLayersParam } : {}),
        },
      });

      markdown += `
<p align="center">
  <img src="${contributionUrl}" alt="Contribution graph" />
</p>

`;
      return;
    }

    if (block === "footer") {
      const baseUrl = resolveBaseUrl();
      const banner = getFooterBannerById(item?.data?.bannerId);
      const footerImageUrl = resolveAbsoluteAssetUrl(
        baseUrl,
        buildFooterBannerRenderPath(banner?.id)
      );
      if (!footerImageUrl) return;

      markdown += `
<p align="center">
  <img src="${footerImageUrl}" alt="${escapeHtmlAttribute(banner?.alt || banner?.title || "Footer banner")}" width="${FOOTER_BANNER_MARKDOWN_WIDTH}" />
</p>
`;
    }
  });

  return markdown.trim();
}

