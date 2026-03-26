import { absoluteUrl } from "./lib/seo";

const publicRoutes = [
  "/",
  "/product",
  "/solutions",
  "/process",
  "/pricing",
  "/changelog",
  "/analyze",
  "/profile-builder",
  "/profile-compare",
];

export default function sitemap() {
  const lastModified = new Date();

  return publicRoutes.map((path) => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency: path === "/changelog" ? "weekly" : "daily",
    priority: path === "/" ? 1 : path === "/pricing" || path === "/product" ? 0.9 : 0.8,
  }));
}

