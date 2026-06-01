export default function manifest() {
  return {
    name: "GitHance",
    short_name: "GitHance",
    description:
      "AI GitHub README generator for repository READMEs, profile READMEs, markdown previews, repository analysis, and developer visibility tools.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0d0f",
    theme_color: "#0b0d0f",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}

