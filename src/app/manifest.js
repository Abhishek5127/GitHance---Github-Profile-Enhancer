export default function manifest() {
  return {
    name: "GitHance",
    short_name: "GitHance",
    description:
      "AI-powered GitHub README generation, repository analysis, profile building, and developer visibility tools.",
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

