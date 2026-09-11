import { NextResponse } from "next/server";
import { ensureBenchmarksSeeded } from "@/lib/benchmarks-db";
import { handleApiError } from "@/lib/api-validation";

export async function GET() {
  try {
    await ensureBenchmarksSeeded();
    return NextResponse.json({
      success: true,
      message: "MongoDB benchmark profiles and initial community ratings seeded successfully.",
    });
  } catch (error: unknown) {
    return handleApiError("GET /api/benchmarks/seed", error, 500, "Failed to seed benchmarks.");
  }
}

export async function POST() {
  return GET();
}
