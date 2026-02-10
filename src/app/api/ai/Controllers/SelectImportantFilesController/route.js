import getRelevantFiles from "@/app/lib/repo/getRelevantFiles";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { tree } = await req.json();

    if (!Array.isArray(tree)) {
      return NextResponse.json(
        { error: "Missing or invalid tree array" },
        { status: 400 }
      );
    }

    const relevantFiles = getRelevantFiles(tree);

    return NextResponse.json({
      success: true,
      files: relevantFiles,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}
