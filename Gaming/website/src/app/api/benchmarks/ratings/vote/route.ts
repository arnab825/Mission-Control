import { NextResponse } from "next/server";
import { voteGameRating } from "@/lib/benchmarks-db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ratingId, voterId } = body;

    if (!ratingId) {
      return NextResponse.json(
        { error: "ratingId is required" },
        { status: 400 }
      );
    }

    const result = await voteGameRating(ratingId, voterId || "anonymous");
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error in POST /api/benchmarks/ratings/vote:", error);
    return NextResponse.json(
      { error: "Failed to vote for rating", details: error.message },
      { status: 500 }
    );
  }
}
