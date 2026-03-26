import type { Metadata } from "next";
import ProfileCompareClient from "./ProfileCompareClient";
import JsonLd from "../components/seo/JsonLd";
import {
  buildMetadata,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "../lib/seo";

export const metadata = buildMetadata({
  title: "Compare GitHub Profiles with Multi-Factor Developer Scoring",
  description:
    "Compare two GitHub profiles across activity, quality, diversity, impact, and popularity with GitHance profile comparison tools.",
  path: "/profile-compare",
  keywords: [
    "compare GitHub profiles",
    "developer profile comparison",
    "GitHub profile analyzer",
    "developer scoring tool",
  ],
}) as Metadata;

const schemas = [
  createSoftwareApplicationSchema({
    name: "GitHance Profile Compare",
    path: "/profile-compare",
    description:
      "A GitHub profile comparison tool that scores developer profiles across activity, quality, diversity, impact, and popularity.",
    featureList: [
      "Compare two GitHub profiles side by side",
      "Multi-factor developer scoring engine",
      "Activity, quality, diversity, impact, and popularity metrics",
    ],
    keywords: ["compare GitHub profiles", "developer scoring tool"],
  }),
  createBreadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Profile Compare", path: "/profile-compare" },
  ]),
];

export default function ProfileComparePage() {
  return (
    <>
      <JsonLd data={schemas} />
      <ProfileCompareClient />
    </>
  );
}
