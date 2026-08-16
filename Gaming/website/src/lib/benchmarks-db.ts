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

// Initial community seed ratings to populate when collection is empty
const INITIAL_SEED_RATINGS = [
  {
    gameId: "spiderman2",
    gameName: "Marvel's Spider-Man 2",
    userName: "VortexRunner",
    rating: 5,
    title: "Incredible 80+ FPS at 4K with DLSS 4 Frame Gen",
    review: "Mission Control preset optimizations completely eliminated micro-stutters during high-speed web-wings traversal through Manhattan wind tunnels. VRAM allocation remained steady at 6.4 GB.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4080 Super",
      cpu: "AMD Ryzen 7 7800X3D",
      ramGB: 32,
      resolution: "4K (3840x2160)",
      fpsReported: 84,
      os: "Windows 11 Pro",
      presetUsed: "Ultra Ray Tracing + Frame Gen",
    },
    recommend: true,
    upvotes: 42,
  },
  {
    gameId: "spiderman2",
    gameName: "Marvel's Spider-Man 2",
    userName: "CyberKnight_99",
    rating: 5,
    title: "Smooth 1440p 120 FPS on RTX 4070 Ti",
    review: "Reflex ultra-low latency mode reduced input lag down to 9.8ms. Ray-traced reflections in Central Park puddles look phenomenal without frame drops.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4070 Ti",
      cpu: "Intel Core i7-14700K",
      ramGB: 32,
      resolution: "1440p (2560x1440)",
      fpsReported: 118,
      os: "Windows 11",
      presetUsed: "Ultra Ray Tracing + DLSS Quality",
    },
    recommend: true,
    upvotes: 28,
  },
  {
    gameId: "spiderman2",
    gameName: "Marvel's Spider-Man 2",
    userName: "AeroPilot",
    rating: 4,
    title: "Solid 65 FPS on RTX 3070 with High Presets",
    review: "On RTX 30 series, dropping crowd density by one tier and enabling Mission Control telemetry allowed locked 60+ FPS throughout symbiote battles.",
    specs: {
      gpu: "NVIDIA GeForce RTX 3070",
      cpu: "AMD Ryzen 5 5600X",
      ramGB: 16,
      resolution: "1440p",
      fpsReported: 67,
      os: "Windows 10",
      presetUsed: "High Settings + DLSS Quality",
    },
    recommend: true,
    upvotes: 19,
  },
  {
    gameId: "gtav",
    gameName: "Grand Theft Auto V Enhanced",
    userName: "SpeedDemon_X",
    rating: 5,
    title: "190+ FPS Ultra Butter Smooth Experience",
    review: "Ultra settings with soft shadows at 1080p produces insane responsiveness. Zero frame pacing anomalies even during 5-star police chases.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4090",
      cpu: "Intel Core i9-13900K",
      ramGB: 64,
      resolution: "1440p",
      fpsReported: 195,
      os: "Windows 11",
      presetUsed: "Ultra Maxed Out",
    },
    recommend: true,
    upvotes: 35,
  },
  {
    gameId: "gtav",
    gameName: "Grand Theft Auto V Enhanced",
    userName: "LosSantosDrifter",
    rating: 5,
    title: "Locked 144 FPS with minimal power draw",
    review: "Tested on RTX 3080 with Mission Control power profile. GPU hovered at 68C with whisper-quiet fan speeds.",
    specs: {
      gpu: "NVIDIA GeForce RTX 3080",
      cpu: "AMD Ryzen 7 5800X3D",
      ramGB: 32,
      resolution: "1440p",
      fpsReported: 148,
      os: "Windows 11",
      presetUsed: "Very High Settings",
    },
    recommend: true,
    upvotes: 21,
  },
  {
    gameId: "tsushima",
    gameName: "Ghost of Tsushima Director's Cut",
    userName: "SamuraiJin",
    rating: 5,
    title: "107 FPS Benchmark Verified with DLSS 4 Frame Gen",
    review: "Wind particles and golden leaf foliage in Otsuna marshes render with incredible fidelity. Exclusive Fullscreen ETW telemetry confirmed zero stutters.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4080",
      cpu: "AMD Ryzen 9 7900X",
      ramGB: 32,
      resolution: "4K (3840x2160)",
      fpsReported: 110,
      os: "Windows 11",
      presetUsed: "Very High / DLSS Quality",
    },
    recommend: true,
    upvotes: 31,
  },
  {
    gameId: "tsushima",
    gameName: "Ghost of Tsushima Director's Cut",
    userName: "RoninBlade",
    rating: 5,
    title: "Flawless combat parry timing with Reflex low latency",
    review: "Stand-off duels feel instantaneous. System latency clocked at 11.2ms on DX12 Ultimate.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4070",
      cpu: "Intel Core i5-13600K",
      ramGB: 32,
      resolution: "1440p",
      fpsReported: 98,
      os: "Windows 11",
      presetUsed: "Very High Preset",
    },
    recommend: true,
    upvotes: 17,
  },
  {
    gameId: "nfsheat",
    gameName: "Need For Speed Heat",
    userName: "NightCrawler_9",
    rating: 5,
    title: "Frostbite 3 Engine runs brilliantly at 75+ FPS",
    review: "Night neon rain reflections and wet asphalt shaders look stunning. Mission Control memory cleanup recovered 800MB VRAM.",
    specs: {
      gpu: "NVIDIA GeForce RTX 3070 Ti",
      cpu: "AMD Ryzen 7 5700X",
      ramGB: 32,
      resolution: "1440p",
      fpsReported: 76,
      os: "Windows 10",
      presetUsed: "Ultra Frostbite",
    },
    recommend: true,
    upvotes: 14,
  },
  {
    gameId: "thedivision",
    gameName: "Tom Clancy's The Division",
    userName: "AgentShadow",
    rating: 5,
    title: "Snowdrop volumetric weather benchmark passed",
    review: "Blizzard storms in the Dark Zone maintain a locked 94 FPS with 10.6ms latency. Ultra settings fully utilized DX12 multithreaded command lists.",
    specs: {
      gpu: "NVIDIA GeForce RTX 4070 Super",
      cpu: "AMD Ryzen 7 7700X",
      ramGB: 32,
      resolution: "1440p",
      fpsReported: 96,
      os: "Windows 11",
      presetUsed: "Ultra Snowdrop",
    },
    recommend: true,
    upvotes: 22,
  },
];

/**
 * Ensures MongoDB is populated with initial benchmark profiles and seed community ratings.
 */
export async function ensureBenchmarksSeeded(): Promise<void> {
  try {
    await connectDB();

    // 1. Seed Benchmark Profiles
    const benchmarkCount = await BenchmarkModel.countDocuments();
    if (benchmarkCount === 0) {
      const benchmarkDocs = Object.values(BENCHMARK_PROFILES).map((profile) => {
        const summary = TESTED_GAMES_LIST.find((g) => g.id === profile.id);
        return {
          ...profile,
          coverImage: summary?.coverImage || `/games/${profile.id}.webp`,
          gameplayGif: summary?.gameplayGif || summary?.coverImage,
          keyTech: summary?.keyTech || ["DirectX 12", "Reflex", "DLSS"],
          averageRating: profile.id === "spiderman2" ? 4.9 : profile.id === "gtav" ? 4.8 : profile.id === "tsushima" ? 4.9 : 4.7,
          totalRatings: profile.id === "spiderman2" ? 142 : profile.id === "gtav" ? 210 : 86,
          recommendationRate: 98,
          avgReportedFps: parseInt(profile.testedSpecs.avgFps) || 80,
        };
      });

      await BenchmarkModel.insertMany(benchmarkDocs);
      console.log(`[MongoDB] Successfully seeded ${benchmarkDocs.length} benchmark profiles.`);
    }

    // 2. Seed Initial Community Game Ratings
    const ratingsCount = await GameRatingModel.countDocuments();
    if (ratingsCount === 0) {
      await GameRatingModel.insertMany(INITIAL_SEED_RATINGS);
      console.log(`[MongoDB] Successfully seeded ${INITIAL_SEED_RATINGS.length} community ratings.`);
    }
  } catch (error) {
    console.warn("[MongoDB] Seed operation error (falling back to static defaults):", error);
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
      recommend: doc.recommend,
      upvotes: doc.upvotes || 0,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching community ratings from MongoDB:", error);
    // Fallback seed ratings
    const filtered = gameId && gameId !== "all"
      ? INITIAL_SEED_RATINGS.filter((r) => r.gameId === gameId)
      : INITIAL_SEED_RATINGS;

    return filtered.map((r, idx) => ({
      id: `seed-${idx}`,
      ...r,
      createdAt: new Date().toISOString(),
    }));
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
        averageRating: 4.9,
        totalRatings: 1,
        recommendationRate: 100,
        avgReportedFps: 80,
        distribution: { 5: 1, 4: 0, 3: 0, 2: 0, 1: 0 },
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
      averageRating: 4.9,
      totalRatings: INITIAL_SEED_RATINGS.length,
      recommendationRate: 98,
      avgReportedFps: 85,
      distribution: { 5: 7, 4: 2, 3: 0, 2: 0, 1: 0 },
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
