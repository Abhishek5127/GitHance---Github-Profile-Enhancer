import {
  generateHeaderSvg,
  generateBioSvg,
  generateStackSvg,
  generateTrophySvg,
} from "@/app/lib/generateBlockSvg";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const type = searchParams.get("type") || "";
  const variant = searchParams.get("variant") || "";
  const theme = searchParams.get("theme") || "midnight";

  let svg = "";

  if (type === "header") {
    const name = searchParams.get("name") || "Your Name";
    const subtitle = searchParams.get("subtitle") || "Building thoughtful software";
    const accents = searchParams.getAll("a");
    svg = generateHeaderSvg({ variant, name, subtitle, accents, theme });
  } else if (type === "bio") {
    const title = searchParams.get("title") || "Full Stack Developer";
    const summary = searchParams.get("summary") || "Building modern web apps.";
    const chips = searchParams.getAll("c");
    svg = generateBioSvg({ variant, title, summary, chips, theme });
  } else if (type === "stack") {
    const stack = searchParams.getAll("s");
    svg = generateStackSvg({ variant, stack, theme });
  } else if (type === "trophy") {
    const title = searchParams.get("title") || "Highlights";
    const columns = Number(searchParams.get("columns") || 4);
    const achievements = searchParams.getAll("a");
    svg = generateTrophySvg({ title, achievements, columns, theme });
  } else {
    svg = generateHeaderSvg({ variant: "stacked", name: "GitHance", subtitle: "Dynamic header" });
  }

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}