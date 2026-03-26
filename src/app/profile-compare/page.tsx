import type { Metadata } from "next";
import ProfileCompareClient from "./ProfileCompareClient";
import JsonLd from "../components/seo/JsonLd";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  absoluteUrl,
  createBreadcrumbSchema,
  createSoftwareApplicationSchema,
} from "../lib/seo";

const title = "Compare GitHub Profiles with Multi-Factor Developer Scoring";
const description =
  "Compare two GitHub profiles across activity, quality, diversity, impact, and popularity with GitHance profile comparison tools.";
const canonical = absoluteUrl("/profile-compare");
const socialImage = absoluteUrl(DEFAULT_OG_IMAGE);

export const metadata: Metadata = {
  title,
  description,
  keywords: [
    "compare GitHub profiles",
    "developer profile comparison",
    "GitHub profile analyzer",
    "developer scoring tool",
  ],
  alternates: {
    canonical,
  },
  openGraph: {
    title,
    description,
    url: canonical,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: socialImage,
        alt: title,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [socialImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

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
