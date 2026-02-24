import { buildRenderUrl, buildTrophyUrl } from "./generateBlockSvg";
import {
  TECH_STACK_CATEGORY_LABELS,
  TECH_STACK_CATEGORY_ORDER,
  getTechIconUrl,
  normalizeTechStackData,
} from "./techStackCatalog";

const escapeHtmlAttribute = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

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

  if (normalizedStack.items.length) {
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

export default function generateMarkdown(canvasItems) {
  let markdown = "";

  const resolveBaseUrl = () => {
    const envUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (envUrl) {
      return envUrl.replace(/\/$/, "");
    }

    if (typeof window !== "undefined") {
      const origin = window.location.origin.replace(/\/$/, "");
      const host = window.location.hostname;
      const isLocal =
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1";

      if (!isLocal) {
        return origin;
      }
    }

    return "https://githance.vercel.app";
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
      ["constellation", "signal", "terminal", "stacked"].includes(item.variant)
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

    if (block === "commits") {
      const baseUrl = resolveBaseUrl();
      const username = String(item.data?.username || "").trim();

      if (username) {
        const contributionUrl = buildRenderUrl({
          baseUrl,
          type: "contribution",
          variant: "summary",
          params: { user: username },
        });
        const streakUrl = buildRenderUrl({
          baseUrl,
          type: "streak",
          variant: "default",
          params: { user: username },
        });
        const lastRepoUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: { user: username, metric: "last_repo" },
        });
        const totalCommitsUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: { user: username, metric: "total_commits" },
        });
        const activeDaysUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: { user: username, metric: "active_days" },
        });
        const topRepoUrl = buildRenderUrl({
          baseUrl,
          type: "repo",
          variant: "metric",
          params: { user: username, metric: "top_repo" },
        });

        markdown += `
## Repo Commit Stats

<p align="center">
  <img src="${contributionUrl}" alt="Contribution summary" />
  <img src="${streakUrl}" alt="Commit streak" />
</p>

<p align="center">
  <img src="${lastRepoUrl}" alt="Last worked repository" />
  <img src="${totalCommitsUrl}" alt="Total commits" />
</p>

<p align="center">
  <img src="${activeDaysUrl}" alt="Active days in 30 and 90 day windows" />
  <img src="${topRepoUrl}" alt="Top repository by recent activity" />
</p>

`;
      }
    }

    if (block === "contribution") {
      const contributionUser = String(item.data?.username || "your-github-username").trim();
      markdown += `
<img src="https://ghchart.rshah.org/${encodeURIComponent(contributionUser)}" alt="Contribution graph" />

`;
    }
  });

  return markdown.trim();
}
