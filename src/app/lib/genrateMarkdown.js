import { buildRenderUrl, buildTrophyUrl } from "./generateBlockSvg";
import {
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  getTechIconUrl,
  normalizeTechStackData,
} from "./techStackCatalog";
import { getRepoCommitStatItemById } from "./repoCommitCatalog";
import { getSectionVariantById } from "./sectionCatalog";
import { CONTRIBUTION_GRAPH_ASSET_PATH } from "./contributionGraphAssets";
import { resolveProfileBuilderUsername } from "./profileComponents";
import {
  getSocialPlatformById,
  normalizeSocialLinksData,
} from "./socialLinksCatalog";
import { normalizeStickerAssignments } from "./stickerCatalog";
import {
  getGraphicComponentVariantById,
  normalizeGraphicComponentData,
} from "./graphicComponentCatalog";

const REPO_COMMIT_MARKDOWN_WIDTH = 360;

const escapeHtmlAttribute = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeContributionAssetPath = (value) =>
  String(value || CONTRIBUTION_GRAPH_ASSET_PATH)
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "") || CONTRIBUTION_GRAPH_ASSET_PATH;

const normalizeFooterAssetPath = (value) =>
  String(value || "")
    .trim()
    .replaceAll("\\", "/")
    .replace(/^\.\//, "")
    .replace(/^\/+/, "");

const encodeStickersParam = (value) => {
  const normalized = normalizeStickerAssignments(value);
  if (!Object.keys(normalized).length) return "";

  try {
    return JSON.stringify(normalized);
  } catch {
    return "";
  }
};

export function buildTechStackMarkdownSection(itemData = {}, options = {}) {
  const {
    includeHeading = true,
    baseUrl = "",
  } = options;

  const normalizedStack = normalizeTechStackData(itemData || {});
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
      const columnCount = Math.max(2, Math.ceil(Math.sqrt(normalizedStack.items.length)));
      const iconCells = normalizedStack.items.map((tech) => {
        const iconUrl = getTechIconUrl(tech);
        const safeName = escapeHtmlAttribute(tech.name);

        if (iconUrl) {
          return `<td align="center" valign="middle" width="84" height="84"><img src="${iconUrl}" alt="${safeName}" width="44" height="44" /></td>`;
        }

        return `<td align="center" valign="middle" width="84" height="84"><sub>${safeName}</sub></td>`;
      });
      const rows = [];

      for (let index = 0; index < iconCells.length; index += columnCount) {
        const chunk = iconCells.slice(index, index + columnCount);
        const paddedChunk =
          chunk.length >= columnCount
            ? chunk
            : [
                ...chunk,
                ...Array.from({ length: columnCount - chunk.length }, () =>
                  '<td align="center" valign="middle" width="84" height="84">&nbsp;</td>'
                ),
              ];

        rows.push(`  <tr>\n${paddedChunk.join("\n")}\n  </tr>`);
      }

      const body = `<div align="${alignment}">\n<table cellpadding="8" cellspacing="0">\n${rows.join("\n")}\n</table>\n</div>`;
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
        .map((tech) => {
          const iconUrl = getTechIconUrl(tech);
          const safeName = escapeHtmlAttribute(tech.name);

          if (iconUrl) {
            return `  <img src="${iconUrl}" alt="${safeName}" width="44" height="44" style="margin-right: 10px; margin-bottom: 8px;" />`;
          }

          const badgeLabel = encodeURIComponent(tech.name || "Tech");
          return `  <img src="https://img.shields.io/badge/${badgeLabel}-111111?style=for-the-badge" alt="${safeName}" style="margin-right: 10px; margin-bottom: 8px;" />`;
        })
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

      if (username) {
        const contributionUrl = buildRenderUrl({
          baseUrl,
          type: "contribution",
          variant: "summary",
          params: {
            user: username,
            ...(installationId ? { installation_id: installationId } : {}),
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
      const contributionAssetPath = normalizeContributionAssetPath(item?.data?.assetPath);
      markdown += `
<p align="center">
  <img src="./${contributionAssetPath}" alt="Contribution graph" />
</p>

`;
      return;
    }

    if (block === "footer") {
      const footerAssetPath = normalizeFooterAssetPath(item?.data?.assetPath);
      if (!footerAssetPath) return;

      markdown += `
<p align="center">
  <img src="./${footerAssetPath}" alt="Footer banner" />
</p>

`;
    }
  });

  return markdown.trim();
}

