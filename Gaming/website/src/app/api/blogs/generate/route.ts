import { NextRequest, NextResponse } from "next/server";
import { generateAndSavePost } from "./shared";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
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

  let targetDate = new Date();
  if (customDateParam) {
    const parsed = new Date(customDateParam);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const allPostTypes = ["GPU News", "Game News", "Hardware Deep-Dive", "Game Revisit"] as const;
  
  const postTypes = requestedCategory && requestedCategory !== "all" && allPostTypes.includes(requestedCategory as any)
    ? [requestedCategory as typeof allPostTypes[number]]
    : allPostTypes;

  const settlementResults = await Promise.allSettled(
    postTypes.map((currentTopic) =>
      generateAndSavePost(currentTopic, targetDate, apiKey, process.env.HF_TOKEN)
    )
  );

  const results = settlementResults
    .filter((r): r is PromiseFulfilledResult<any> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.saved).length,
    posts: results,
  });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const authHeader = request.headers.get("authorization");
    const isVercelCron = request.headers.get("x-vercel-cron") === "1";
    const isValidCronSecret = Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

    if (!isVercelCron && !isValidCronSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return POST(request);
}
