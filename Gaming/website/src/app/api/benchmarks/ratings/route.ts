import { NextResponse } from "next/server";
import { getGameRatings, getRatingSummary, createGameRating } from "@/lib/benchmarks-db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || undefined;
    const sortBy = (searchParams.get("sortBy") as "top" | "latest") || "top";
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const [ratings, summary] = await Promise.all([
      getGameRatings(gameId, sortBy, limit),
      getRatingSummary(gameId),
    ]);

    return NextResponse.json({ ratings, summary });
  } catch (error: any) {
    console.error("Error in GET /api/benchmarks/ratings:", error);
    return NextResponse.json(
      { error: "Failed to fetch ratings", details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId, gameName, userName, rating, title, review, specs, recommend } = body;

    // Validation
    if (!gameId || !gameName || !title || !review || !rating) {
      return NextResponse.json(
        { error: "Missing required fields: gameId, gameName, title, review, rating" },
        { status: 400 }
      );
    }

    const numRating = Number(rating);
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      return NextResponse.json(
        { error: "Rating must be an integer between 1 and 5" },
        { status: 400 }
      );
    }

    if (!specs || !specs.gpu || !specs.cpu) {
      return NextResponse.json(
        { error: "Hardware specifications (gpu, cpu) are required" },
        { status: 400 }
      );
    }

    const newRating = await createGameRating({
      gameId,
      gameName,
      userName: userName ? String(userName).trim().slice(0, 40) : "Aero Operator",
      rating: Math.round(numRating),
      title: String(title).trim().slice(0, 120),
      review: String(review).trim().slice(0, 2000),
      specs: {
        gpu: String(specs.gpu).trim(),
        cpu: String(specs.cpu).trim(),
        ramGB: Number(specs.ramGB) || 16,
        resolution: specs.resolution || "1440p",
        fpsReported: Number(specs.fpsReported) || 60,
        os: specs.os || "Windows 11",
        presetUsed: specs.presetUsed || "Optimal Preset",
      },
      recommend: recommend !== false,
    });

    if (!newRating) {
      return NextResponse.json(
        { error: "Failed to save rating to database" },
        { status: 500 }
      );
    }

    // Also fetch updated summary to return to client
    const summary = await getRatingSummary(gameId);

    return NextResponse.json({ rating: newRating, summary }, { status: 201 });
  } catch (error: any) {
    console.error("Error in POST /api/benchmarks/ratings:", error);
    return NextResponse.json(
      { error: "Failed to create rating", details: error.message },
      { status: 500 }
    );
  }
}
