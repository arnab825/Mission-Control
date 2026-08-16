import { NextResponse } from "next/server";
import { ensureBenchmarksSeeded } from "@/lib/benchmarks-db";

export async function GET() {
  try {
    await ensureBenchmarksSeeded();
    return NextResponse.json({
      success: true,
      message: "MongoDB benchmark profiles and initial community ratings seeded successfully.",
    });
  } catch (error: any) {
    console.error("Error in GET /api/benchmarks/seed:", error);
    return NextResponse.json(
      { error: "Failed to seed benchmarks", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}
