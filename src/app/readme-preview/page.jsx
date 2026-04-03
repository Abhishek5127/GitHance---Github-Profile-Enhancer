import ReadmePreviewClient from "./ReadmePreviewClient";
import { buildMetadata } from "@/app/lib/seo";

export const metadata = buildMetadata({
  title: "README Preview",
  description: "Preview a generated README exactly as it will render on GitHub, then copy or download the markdown.",
  path: "/readme-preview",
  keywords: ["README preview", "GitHub markdown preview", "GitHance preview"],
  noIndex: true,
});

export default function ReadmePreviewPage() {
  return <ReadmePreviewClient />;
}
