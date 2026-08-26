import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const userAgent = request.headers.get("user-agent") || "";
  const isVercelCron = request.headers.get("x-vercel-cron") === "1" || userAgent.toLowerCase().includes("vercel-cron");
  const isValidCronSecret = Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);

  if (!isVercelCron && !isValidCronSecret && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    status: "ok",
    services: {},
  };

  // 1. Ping MongoDB Atlas to prevent cluster inactivity sleep
  try {
    const mongooseInstance = await connectDB();
    const isReady = mongooseInstance.connection.readyState === 1;
    results.services.mongodb = { status: isReady ? "active" : "connecting", readyState: mongooseInstance.connection.readyState };
  } catch (err: any) {
    results.services.mongodb = { status: "error", error: err?.message || String(err) };
  }

  // 2. Ping Render Cloud Distributed Server to keep it warm (if configured)
  if (process.env.NEXT_PUBLIC_LIBRARY_SERVER_URL) {
    try {
      const renderUrl = process.env.NEXT_PUBLIC_LIBRARY_SERVER_URL.replace(/\/$/, "");
      const res = await fetch(`${renderUrl}/health`, {
        headers: { "User-Agent": "MissionControl-WebsiteCron/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      results.services.distributed_server = {
        status: res.ok ? "active" : "degraded",
        http_status: res.status,
      };
    } catch (err: any) {
      results.services.distributed_server = { status: "timeout_or_error", error: err?.message || String(err) };
    }
  }

  // 3. Ping Supabase if configured
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
      const res = await fetch(`${supabaseUrl}/rest/v1/canonical_games?select=id&limit=1`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      results.services.supabase = {
        status: res.ok ? "active" : "degraded",
        http_status: res.status,
      };
    } catch (err: any) {
      results.services.supabase = { status: "error", error: err?.message || String(err) };
    }
  }

  return NextResponse.json(results);
}
