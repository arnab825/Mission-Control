import { NextResponse } from "next/server";
import { voteGameRating } from "@/lib/benchmarks-db";
import { handleApiError } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ratingId, voterId } = body;

    if (!ratingId || typeof ratingId !== "string" || !ratingId.trim()) {
      return NextResponse.json(
        { error: "ratingId is required" },
        { status: 400 }
      );
    }

    const cleanRatingId = ratingId.trim().slice(0, 64);
    const cleanVoterId = voterId && typeof voterId === "string" ? voterId.trim().slice(0, 64) : "anonymous";

    const result = await voteGameRating(cleanRatingId, cleanVoterId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError("POST /api/benchmarks/ratings/vote", error, 500, "Failed to register rating vote.");
  }
}
