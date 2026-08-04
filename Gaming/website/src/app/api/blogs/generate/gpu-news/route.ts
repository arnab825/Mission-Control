import { NextRequest, NextResponse } from "next/server";
import { generateAndSavePost } from "../shared";

export const maxDuration = 60;

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
  let targetDate = new Date();
  if (customDateParam) {
    const parsed = new Date(customDateParam);
    if (!isNaN(parsed.getTime())) {
      targetDate = parsed;
    }
  }

  const result = await generateAndSavePost("GPU News", targetDate, apiKey, process.env.HF_TOKEN);

  return NextResponse.json({
    success: !!result?.saved,
    post: result,
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
