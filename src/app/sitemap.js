import { absoluteUrl } from "./lib/seo";

const publicRoutes = [
  "/",
  "/product",
  "/solutions",
  "/process",
  "/contribute",
  "/analyze",
  "/profile-builder",
  "/profile-compare",
];

export default function sitemap() {
  const lastModified = new Date();

  return publicRoutes.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: "daily",
    priority: path === "/" ? 1 : path === "/product" ? 0.9 : 0.8,
  }));
}
