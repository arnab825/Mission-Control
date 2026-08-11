import { NextRequest, NextResponse } from "next/server";
import { generateAndSavePost } from "./shared";

export const maxDuration = 60; // 60s limit for Vercel Hobby (Free) plan

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    const userAgent = request.headers.get("user-agent") || "";
    const isVercelCron = request.headers.get("x-vercel-cron") === "1" || userAgent.toLowerCase().includes("vercel-cron");
    const isValidCronSecret = Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

    if (!isVercelCron && !isValidCronSecret) {
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
  const batch = searchParams.get("batch");

  let targetDate = new Date();
  if (customDateParam) {
    const parsed = new Date(customDateParam);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const allPostTypes = ["GPU News", "Game News", "Hardware Deep-Dive", "Game Revisit"] as const;
  
  let postTypes: ("GPU News" | "Game News" | "Hardware Deep-Dive" | "Game Revisit")[];

  if (batch === "1") {
    postTypes = ["GPU News", "Game News"];
  } else if (batch === "2") {
    postTypes = ["Hardware Deep-Dive", "Game Revisit"];
  } else if (requestedCategory && requestedCategory !== "all" && allPostTypes.includes(requestedCategory as any)) {
    postTypes = [requestedCategory as typeof allPostTypes[number]];
  } else {
    postTypes = [...allPostTypes];
  }

  // Run sequentially to avoid hammering image APIs (Gemini/HF/Pollinations) with 4 concurrent
  // requests at once, which causes all tiers to rate-limit/timeout simultaneously and fall through
  // to the placeholder — or worse, save nothing.
  const results: any[] = [];
  for (const currentTopic of postTypes) {
    try {
      const result = await generateAndSavePost(currentTopic, targetDate, apiKey, process.env.HF_TOKEN);
      if (result !== null) results.push(result);
    } catch (err) {
      console.error(`[BlogGen][${currentTopic}] Unhandled error in generateAndSavePost:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.saved).length,
    posts: results,
  });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    const userAgent = request.headers.get("user-agent") || "";
    const isVercelCron = request.headers.get("x-vercel-cron") === "1" || userAgent.toLowerCase().includes("vercel-cron");
    const isValidCronSecret = Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

    if (!isVercelCron && !isValidCronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return POST(request);
}
