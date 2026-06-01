import ProfileBuilderClient from "./ProfileBuilderClient";
import JsonLd from "@/app/components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "@/app/lib/seo";

export const metadata = buildMetadata({
  title: "GitHub Profile README Generator and Builder",
  description:
    "Generate a GitHub profile README with reusable blocks, live markdown preview, tech stack sections, contribution widgets, and export-ready markdown for developers.",
  path: "/profile-builder",
  keywords: [
    "GitHub profile README generator",
    "GitHub profile README builder",
    "profile README generator",
    "GitHub README generator",
    "markdown README generator",
    "developer portfolio builder",
    "GitHub profile optimizer",
  ],
});

const profileBuilderSchema = createSoftwareApplicationSchema({
  name: "GitHance Profile Builder",
  path: "/profile-builder",
  description:
    "A GitHub profile README generator for developers who want reusable content blocks, live markdown preview, visual polish, and faster profile iteration.",
  keywords: [
    "GitHub profile README generator",
    "GitHub profile README builder",
    "developer profile tool",
    "profile README editor",
  ],
  featureList: [
    "Drag-and-drop profile README builder",
    "Contribution graph and commit stat blocks",
    "Tech stack picker and sticker library",
    "Live markdown preview and export flow",
  ],
});

const breadcrumbSchema = createBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Profile Builder", path: "/profile-builder" },
]);

export default function ProfileBuilderPage() {
  return (
    <>
      <JsonLd data={[profileBuilderSchema, breadcrumbSchema]} />
      <ProfileBuilderClient />
    </>
  );
}

