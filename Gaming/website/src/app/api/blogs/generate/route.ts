import { NextRequest, NextResponse } from "next/server";
import { generateAndSavePost } from "./shared";

export const maxDuration = 60; // Max for Hobby plan (this route is for local sequential dev/trigger.ts)

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const customDateParam = searchParams.get("date");
  const requestedCategory = searchParams.get("category");

  let targetDate = new Date();
  if (customDateParam) {
    const parsed = new Date(customDateParam);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const results: { type: string; slug: string; saved: boolean }[] = [];
  const allPostTypes = ["GPU News", "Game News", "Hardware Deep-Dive", "Game Revisit"] as const;
  
  // If specific category filter is requested, generate only for that category
  const postTypes = requestedCategory && requestedCategory !== "all" && allPostTypes.includes(requestedCategory as any)
    ? [requestedCategory as typeof allPostTypes[number]]
    : allPostTypes;

  for (const currentTopic of postTypes) {
    const result = await generateAndSavePost(currentTopic, targetDate, apiKey, process.env.HF_TOKEN);
    if (result) {
      results.push(result);
    }
  }

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.saved).length,
    posts: results,
  });
}

// Allow GET for manual one-off trigger in dev
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return POST(request);
}
