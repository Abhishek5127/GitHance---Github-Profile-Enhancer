import type { Metadata } from "next";
import ProfileCompareClient from "./ProfileCompareClient";

export const metadata: Metadata = {
  title: "Profile Compare | GitHance",
  description:
    "Compare two GitHub profiles with a multi-factor developer scoring engine built from activity, quality, diversity, impact, and popularity metrics.",
};

export default function ProfileComparePage() {
  return <ProfileCompareClient />;
}
