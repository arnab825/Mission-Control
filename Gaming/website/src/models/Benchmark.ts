import mongoose, { Schema, Document } from "mongoose";

export interface IBenchmark extends Document {
  id: string; // Unique game slug identifier (e.g. "spiderman2", "gtav")
  name: string;
  publisher: string;
  releaseYear: string;
  genre: string;
  api: string;
  score: number;
  status: string;
  preset: string;
  overview: string;
  coverImage?: string;
  gameplayGif?: string;
  dlssVersion?: string;
  aiVisionStatus?: string;
  storeRating?: string;
  
  // Detailed Game Narrative & Systems
  detailedOverview: {
    story: string;
    gameplayLoop: string;
    keyMechanics: Array<{
      name: string;
      desc: string;
    }>;
  };

  // Hardware Performance & Telemetry
  testedSpecs: {
    gpu: string;
    resolution: string;
    avgFps: string;
    vramUsed: string;
    latency: string;
    gpuLoad: string;
  };

  // Preset Recommendations
  presets: {
    rtx40: string;
    rtx30: string;
    gtx: string;
  };

  // Verified Hardware Features
  features: Array<{
    name: string;
    desc: string;
    active: boolean;
  }>;

  // 4K Screenshots & Captures
  screenshots: Array<{
    src: string;
    title: string;
    desc: string;
  }>;

  // Key Tech Tags for summary display
  keyTech?: string[];

  // Dynamic Community Rating Aggregates
  averageRating: number;
  totalRatings: number;
  recommendationRate: number;
  avgReportedFps?: number;

  createdAt: Date;
  updatedAt: Date;
}

const BenchmarkSchema = new Schema<IBenchmark>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    publisher: { type: String, required: true },
    releaseYear: { type: String, default: "2024" },
    genre: { type: String, required: true },
    api: { type: String, required: true },
    score: { type: Number, default: 95 },
    status: { type: String, default: "VERIFIED BENCHMARK" },
    preset: { type: String, default: "Ultra Ray Tracing" },
    overview: { type: String, required: true },
    coverImage: { type: String },
    gameplayGif: { type: String },
    dlssVersion: { type: String, default: "DLSS 4" },
    aiVisionStatus: { type: String },
    storeRating: { type: String },

    detailedOverview: {
      story: { type: String, default: "" },
      gameplayLoop: { type: String, default: "" },
      keyMechanics: [
        {
          name: { type: String, required: true },
          desc: { type: String, required: true },
        },
      ],
    },

    testedSpecs: {
      gpu: { type: String, default: "RTX 4090" },
      resolution: { type: String, default: "4K (3840x2160)" },
      avgFps: { type: String, default: "80 FPS" },
      vramUsed: { type: String, default: "6.5 GB / 8.0 GB" },
      latency: { type: String, default: "10.8 ms" },
      gpuLoad: { type: String, default: "94%" },
    },

    presets: {
      rtx40: { type: String, default: "Ultra Ray Tracing + DLSS 4 Frame Gen" },
      rtx30: { type: String, default: "High Settings + DLSS Quality" },
      gtx: { type: String, default: "Medium Settings + FSR 3 / Native 1080p" },
    },

    features: [
      {
        name: { type: String, required: true },
        desc: { type: String, required: true },
        active: { type: Boolean, default: true },
      },
    ],

    screenshots: [
      {
        src: { type: String, required: true },
        title: { type: String, required: true },
        desc: { type: String, required: true },
      },
    ],

    keyTech: { type: [String], default: [] },

    averageRating: { type: Number, default: 4.9 },
    totalRatings: { type: Number, default: 0 },
    recommendationRate: { type: Number, default: 98 },
    avgReportedFps: { type: Number, default: 80 },
  },
  { timestamps: true }
);

export default mongoose.models.Benchmark ||
  mongoose.model<IBenchmark>("Benchmark", BenchmarkSchema);
