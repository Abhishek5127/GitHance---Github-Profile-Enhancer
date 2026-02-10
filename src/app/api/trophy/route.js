import { generateTrophySvg } from "@/app/lib/generateTrophySvg";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);

  const title = searchParams.get("title") || "Highlights";
  const theme = searchParams.get("theme") || "midnight";
  const columns = Number(searchParams.get("columns") || 4);
  const achievements = searchParams.getAll("a");

  const svg = generateTrophySvg({
    title,
    achievements,
    theme,
    columns,
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}