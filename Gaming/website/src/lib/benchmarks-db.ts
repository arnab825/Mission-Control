import connectDB from "./mongodb";
import BenchmarkModel, { IBenchmark } from "@/models/Benchmark";
import GameRatingModel, { IGameRating } from "@/models/GameRating";
import {
  BENCHMARK_PROFILES,
  TESTED_GAMES_LIST,
  BenchmarkProfile,
  TestedGameSummary,
  getBenchmarkProfileById,
} from "@/data/benchmarks";

export interface GameRatingMedia {
  url: string;
  type: "image" | "gif" | "video";
  name?: string;
}

export interface GameRatingItem {
  id: string;
  gameId: string;
  gameName: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  title: string;
  review: string;
  specs: {
    gpu: string;
    cpu: string;
    ramGB: number;
    resolution: string;
    fpsReported: number;
    os: string;
    presetUsed?: string;
  };
  media?: GameRatingMedia[];
  recommend: boolean;
  upvotes: number;
  createdAt: string;
}

export interface RatingStats {
  averageRating: number;
  totalRatings: number;
  recommendationRate: number;
  avgReportedFps: number;
  distribution: { [key: number]: number };
}

/**
 * Ensures MongoDB is populated with initial verified benchmark profiles (admin-curated).
 * Community posts and user ratings are strictly user-generated without mock data.
 */
export async function ensureBenchmarksSeeded(): Promise<void> {
  try {
    await connectDB();

    // Clean up any stale/deleted games not in BENCHMARK_PROFILES
    const validIds = Object.keys(BENCHMARK_PROFILES);
    await BenchmarkModel.deleteMany({ id: { $nin: validIds } });

    // Sync/Upsert Admin Benchmark Profiles so new games are always present in MongoDB
    const syncOps = Object.values(BENCHMARK_PROFILES).map((profile) => {
      const summary = TESTED_GAMES_LIST.find((g) => g.id === profile.id);
      return BenchmarkModel.findOneAndUpdate(
        { id: profile.id },
        {
          $set: {
            ...profile,
            coverImage: summary?.coverImage || `/games/${profile.id}.webp`,
            gameplayGif: summary?.gameplayGif || summary?.coverImage,
            keyTech: summary?.keyTech || ["DirectX 12", "Reflex", "DLSS"],
          },
          $setOnInsert: {
            averageRating: profile.score ? profile.score / 20 : 5.0,
            totalRatings: 0,
            recommendationRate: 100,
            avgReportedFps: parseInt(profile.testedSpecs.avgFps) || 60,
          },
        },
        { upsert: true, returnDocument: 'after' }
      );
    });

    await Promise.all(syncOps);
    console.log(`[MongoDB] Verified sync for ${syncOps.length} benchmark profiles.`);
  } catch (error) {
    console.warn("[MongoDB] Benchmark profiles seed error (falling back to static defaults):", error);
  }
}

/**
 * Calculates a star string based on score (e.g. 4.9 -> "4.9 ★★★★★")
 */
export function formatStoreRating(rating: number): string {
  const rounded = Math.round(rating * 10) / 10;
  const fullStars = Math.floor(rounded);
  const stars = "★".repeat(Math.min(5, fullStars)) + "☆".repeat(Math.max(0, 5 - fullStars));
  return `${rounded.toFixed(1)} ${stars}`;
}

/**
 * Fetches all benchmark profiles and tested games summary with live MongoDB community rating data.
 */
export async function getBenchmarksFromDB(): Promise<{
  profiles: Record<string, BenchmarkProfile>;
  testedGames: TestedGameSummary[];
}> {
  try {
    await connectDB();
    await ensureBenchmarksSeeded();

    const [dbProfiles, ratingsSummary] = await Promise.all([
      BenchmarkModel.find({}).lean(),
      GameRatingModel.aggregate([
        {
          $group: {
            _id: "$gameId",
            avgRating: { $avg: "$rating" },
            count: { $sum: 1 },
            avgFps: { $avg: "$specs.fpsReported" },
            recCount: {
              $sum: { $cond: [{ $eq: ["$recommend", true] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    // Build rating map by gameId
    const ratingMap: Record<string, { avg: number; count: number; recRate: number }> = {};
    ratingsSummary.forEach((r: any) => {
      ratingMap[r._id] = {
        avg: Math.round((r.avgRating || 4.8) * 10) / 10,
        count: r.count || 0,
        recRate: r.count > 0 ? Math.round((r.recCount / r.count) * 100) : 98,
      };
    });

    if (dbProfiles && dbProfiles.length > 0) {
      const profiles: Record<string, BenchmarkProfile> = {};
      const testedGames: TestedGameSummary[] = [];

      dbProfiles.forEach((doc: any) => {
        const liveRating = ratingMap[doc.id] || {
          avg: doc.averageRating || 4.8,
          count: doc.totalRatings || 10,
          recRate: doc.recommendationRate || 98,
        };

        const formattedRating = formatStoreRating(liveRating.avg);

        const profile: BenchmarkProfile = {
          id: doc.id,
          name: doc.name,
          publisher: doc.publisher,
          releaseYear: doc.releaseYear,
          genre: doc.genre,
          api: doc.api,
          score: doc.score,
          status: doc.status,
          preset: doc.preset,
          overview: doc.overview,
          detailedOverview: doc.detailedOverview,
          testedSpecs: doc.testedSpecs,
          presets: doc.presets,
          features: doc.features,
          screenshots: doc.screenshots,
          gameplayGif: doc.gameplayGif,
          storeRating: formattedRating,
          dlssVersion: doc.dlssVersion,
          aiVisionStatus: doc.aiVisionStatus,
        };

        profiles[doc.id] = profile;

        testedGames.push({
          id: doc.id,
          name: doc.name,
          publisher: doc.publisher,
          genre: doc.genre,
          preset: doc.preset,
          keyTech: doc.keyTech || ["DirectX 12", "Reflex", "DLSS"],
          status: doc.status,
          fps: doc.testedSpecs?.avgFps || "80 FPS",
          vram: doc.testedSpecs?.vramUsed || "6.5 GB / 8.0 GB",
          gpuLoad: doc.testedSpecs?.gpuLoad || "94%",
          latency: doc.testedSpecs?.latency || "10.8 ms",
          api: doc.api,
          coverImage: doc.coverImage || `/games/${doc.id}.webp`,
          gameplayGif: doc.gameplayGif,
          storeRating: formattedRating,
          dlssVersion: doc.dlssVersion,
        });
      });

      return { profiles, testedGames };
    }
  } catch (error) {
    console.warn("[MongoDB] Error fetching benchmarks from MongoDB (using static fallback):", error);
  }

  // Fallback to static definitions
  return {
    profiles: BENCHMARK_PROFILES,
    testedGames: TESTED_GAMES_LIST,
  };
}

/**
 * Fetches a single benchmark profile by ID from MongoDB with static fallback.
 */
export async function getBenchmarkByIdFromDB(id: string): Promise<BenchmarkProfile> {
  try {
    await connectDB();
    const doc = await BenchmarkModel.findOne({ id }).lean();
    if (doc) {
      const stats = await getRatingSummary(id);
      return {
        id: (doc as any).id,
        name: (doc as any).name,
        publisher: (doc as any).publisher,
        releaseYear: (doc as any).releaseYear,
        genre: (doc as any).genre,
        api: (doc as any).api,
        score: (doc as any).score,
        status: (doc as any).status,
        preset: (doc as any).preset,
        overview: (doc as any).overview,
        detailedOverview: (doc as any).detailedOverview,
        testedSpecs: (doc as any).testedSpecs,
        presets: (doc as any).presets,
        features: (doc as any).features,
        screenshots: (doc as any).screenshots,
        gameplayGif: (doc as any).gameplayGif,
        storeRating: formatStoreRating(stats.averageRating),
        dlssVersion: (doc as any).dlssVersion,
        aiVisionStatus: (doc as any).aiVisionStatus,
      };
    }
  } catch (error) {
    console.warn(`[MongoDB] Error fetching benchmark ${id}:`, error);
  }

  return getBenchmarkProfileById(id);
}

/**
 * Fetches community ratings and reviews from MongoDB.
 */
export async function getGameRatings(
  gameId?: string,
  sortBy: "top" | "latest" = "top",
  limit: number = 50
): Promise<GameRatingItem[]> {
  try {
    await connectDB();
    await ensureBenchmarksSeeded();

    const query: any = {};
    if (gameId && gameId !== "all") {
      query.gameId = gameId;
    }

    const sortOrder: any =
      sortBy === "top" ? { upvotes: -1, createdAt: -1 } : { createdAt: -1 };

    const docs = await GameRatingModel.find(query)
      .sort(sortOrder)
      .limit(limit)
      .lean();

    return docs.map((doc: any) => ({
      id: doc._id.toString(),
      gameId: doc.gameId,
      gameName: doc.gameName,
      userName: doc.userName,
      userAvatar: doc.userAvatar,
      rating: doc.rating,
      title: doc.title,
      review: doc.review,
      specs: doc.specs,
      media: doc.media || [],
      recommend: doc.recommend,
      upvotes: doc.upvotes || 0,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching community ratings from MongoDB:", error);
    return [];
  }
}

/**
 * Computes rating summary statistics for a game or across all games.
 */
export async function getRatingSummary(gameId?: string): Promise<RatingStats> {
  try {
    await connectDB();
    const query: any = {};
    if (gameId && gameId !== "all") {
      query.gameId = gameId;
    }

    const ratings = await GameRatingModel.find(query).lean();
    if (ratings.length === 0) {
      return {
        averageRating: 0,
        totalRatings: 0,
        recommendationRate: 100,
        avgReportedFps: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      };
    }

    const distribution: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sumScore = 0;
    let sumFps = 0;
    let recommendCount = 0;

    ratings.forEach((r: any) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      distribution[star] = (distribution[star] || 0) + 1;
      sumScore += r.rating;
      sumFps += r.specs?.fpsReported || 60;
      if (r.recommend) recommendCount++;
    });

    const total = ratings.length;
    const avgScore = Math.round((sumScore / total) * 10) / 10;
    const avgFps = Math.round(sumFps / total);
    const recRate = Math.round((recommendCount / total) * 100);

    return {
      averageRating: avgScore,
      totalRatings: total,
      recommendationRate: recRate,
      avgReportedFps: avgFps,
      distribution,
    };
  } catch (error) {
    console.error("Error computing rating summary:", error);
    return {
      averageRating: 0,
      totalRatings: 0,
      recommendationRate: 100,
      avgReportedFps: 0,
      distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    };
  }
}

/**
 * Creates a new community game rating and updates the benchmark's cached stats.
 */
export async function createGameRating(ratingData: {
  gameId: string;
  gameName: string;
  userName: string;
  rating: number;
  title: string;
  review: string;
  specs: {
    gpu: string;
    cpu: string;
    ramGB: number;
    resolution: string;
    fpsReported: number;
    os: string;
    presetUsed?: string;
  };
  media?: GameRatingMedia[];
  recommend: boolean;
}): Promise<GameRatingItem | null> {
  try {
    await connectDB();

    const doc = await GameRatingModel.create({
      ...ratingData,
      upvotes: 0,
      voters: [],
    });

    // Recalculate and update Benchmark cache
    const summary = await getRatingSummary(ratingData.gameId);
    await BenchmarkModel.findOneAndUpdate(
      { id: ratingData.gameId },
      {
        averageRating: summary.averageRating,
        totalRatings: summary.totalRatings,
        recommendationRate: summary.recommendationRate,
        avgReportedFps: summary.avgReportedFps,
        storeRating: formatStoreRating(summary.averageRating),
      }
    );

    return {
      id: doc._id.toString(),
      gameId: doc.gameId,
      gameName: doc.gameName,
      userName: doc.userName,
      userAvatar: doc.userAvatar,
      rating: doc.rating,
      title: doc.title,
      review: doc.review,
      specs: doc.specs,
      media: doc.media || [],
      recommend: doc.recommend,
      upvotes: doc.upvotes,
      createdAt: doc.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("Error creating game rating in MongoDB:", error);
    return null;
  }
}

/**
 * Upvotes a community rating.
 */
export async function voteGameRating(
  ratingId: string,
  voterId: string = "anonymous"
): Promise<{ success: boolean; upvotes: number }> {
  try {
    await connectDB();

    const existing = await GameRatingModel.findById(ratingId);
    if (!existing) {
      return { success: false, upvotes: 0 };
    }

    // Prevent duplicate voting from the same client identifier
    if (voterId && existing.voters?.includes(voterId)) {
      return { success: false, upvotes: existing.upvotes };
    }

    const updated = await GameRatingModel.findByIdAndUpdate(
      ratingId,
      {
        $inc: { upvotes: 1 },
        $addToSet: { voters: voterId },
      },
      { returnDocument: "after" }
    ).lean();

    return {
      success: true,
      upvotes: (updated as any)?.upvotes || existing.upvotes + 1,
    };
  } catch (error) {
    console.error("Error voting for game rating in MongoDB:", error);
    return { success: false, upvotes: 0 };
  }
}
