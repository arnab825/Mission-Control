import { NextResponse } from "next/server";
import { voteGameRating } from "@/lib/benchmarks-db";
import { handleApiError, validateRequestBody, GameRatingVoteSchema } from "@/lib/api-validation";

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = validateRequestBody(GameRatingVoteSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { ratingId, voterId } = validation.data;
    const result = await voteGameRating(ratingId, voterId);
    return NextResponse.json(result);
  } catch (error: unknown) {
    return handleApiError("POST /api/benchmarks/ratings/vote", error, 500, "Failed to register rating vote.");
  }
}

