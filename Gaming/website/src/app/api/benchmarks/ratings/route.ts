import { NextResponse } from "next/server";
import { getGameRatings, getRatingSummary, createGameRating } from "@/lib/benchmarks-db";
import { handleApiError, validateRequestBody, GameRatingCreateSchema } from "@/lib/api-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId") || undefined;
    const sortBy = (searchParams.get("sortBy") as "top" | "latest") || "top";
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10) || 50));

    const [ratings, summary] = await Promise.all([
      getGameRatings(gameId, sortBy, limit),
      getRatingSummary(gameId),
    ]);

    return NextResponse.json({ ratings, summary });
  } catch (error: unknown) {
    return handleApiError("GET /api/benchmarks/ratings", error, 500, "Failed to retrieve ratings.");
  }
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = validateRequestBody(GameRatingCreateSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { gameId, gameName, userName, rating, title, review, specs, media, recommend } = validation.data;

    const formattedMedia = (media || []).map((m) => ({
      url: m.url,
      type: m.type,
      name: m.name,
    }));

    const newRating = await createGameRating({
      gameId,
      gameName,
      userName: userName || "Aero Operator",
      rating: Math.round(rating),
      title,
      review,
      specs: {
        gpu: specs.gpu,
        cpu: specs.cpu,
        ramGB: specs.ramGB,
        resolution: specs.resolution,
        fpsReported: specs.fpsReported,
        os: specs.os,
        presetUsed: specs.presetUsed,
      },
      media: formattedMedia,
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
  } catch (error: unknown) {
    return handleApiError("POST /api/benchmarks/ratings", error, 500, "Failed to register game rating.");
  }
}
