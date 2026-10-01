import { NextResponse } from "next/server";
import { getBenchmarksFromDB, getBenchmarkByIdFromDB } from "@/lib/benchmarks-db";
import { handleApiError } from "@/lib/api-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const edgeCacheHeaders = {
      "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      "Vercel-CDN-Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
    };

    if (id) {
      const cleanId = id.trim().slice(0, 100);
      const profile = await getBenchmarkByIdFromDB(cleanId);
      if (!profile) {
        return NextResponse.json({ error: "Benchmark profile not found" }, { status: 404 });
      }
      return NextResponse.json(profile, { headers: edgeCacheHeaders });
    }

    const data = await getBenchmarksFromDB();
    return NextResponse.json(data, { headers: edgeCacheHeaders });
  } catch (error: unknown) {
    return handleApiError("GET /api/benchmarks", error, 500, "Failed to retrieve benchmarks.");
  }
}
