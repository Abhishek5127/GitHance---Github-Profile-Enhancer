import { buildRenderUrl, buildTrophyUrl } from "./generateBlockSvg";

export default function generateMarkdown(canvasItems) {
  let markdown = "";

  const techLogoMap = {
    "next.js": "nextdotjs",
    "react": "react",
    "node.js": "nodedotjs",
    "tailwind css": "tailwindcss",
    "tailwind": "tailwindcss",
    "typescript": "typescript",
    "javascript": "javascript",
    "python": "python",
    "postgresql": "postgresql",
    "mongodb": "mongodb",
    "docker": "docker",
    "git": "git",
    "github": "github",
    "vercel": "vercel",
  };

  const techColorMap = {
    nextdotjs: "000000",
    react: "61DAFB",
    nodedotjs: "339933",
    tailwindcss: "06B6D4",
    typescript: "3178C6",
    javascript: "F7DF1E",
    python: "3776AB",
    postgresql: "4169E1",
    mongodb: "47A248",
    docker: "2496ED",
    git: "F05032",
    github: "181717",
    vercel: "000000",
  };

  const buildBadgeUrl = (label) => {
    const key = (label || "").trim().toLowerCase();
    const logo = techLogoMap[key];
    const color = logo ? techColorMap[logo] || "111111" : "111111";
    const safeLabel = encodeURIComponent(label.trim());

    if (logo) {
      return `https://img.shields.io/badge/${safeLabel}-${color}?style=for-the-badge&logo=${logo}&logoColor=white`;
    }

    return `https://img.shields.io/badge/${safeLabel}-${color}?style=for-the-badge`;
  };

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
      const baseUrl = resolveBaseUrl();
      const variant = item.data?.variant || "grid";
      const url = buildRenderUrl({
        baseUrl,
        type: "stack",
        variant,
        params: {
          theme: item.data?.theme || "midnight",
          s: item.data?.stack || [],
        },
      });

      markdown += `
<div align="center">
  <img src="${url}" alt="Tech Stack" />
</div>

`;
    }

    if (block === "contribution") {
      markdown += `
<img src="https://ghchart.rshah.org/abhishek5127" alt="contribution Graph Image" />

`;
    }
  });

  return markdown.trim();
}
