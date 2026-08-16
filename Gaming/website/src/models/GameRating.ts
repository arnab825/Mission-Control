import mongoose, { Schema, Document } from "mongoose";

export interface IGameRatingMedia {
  url: string;
  type: "image" | "gif" | "video";
  name?: string;
}

export interface IGameRating extends Document {
  gameId: string; // ID of the benchmarked game (e.g. "spiderman2")
  gameName: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1 to 5
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
  media?: IGameRatingMedia[];
  recommend: boolean;
  upvotes: number;
  voters: string[];
  createdAt: Date;
  updatedAt: Date;
}

const GameRatingSchema = new Schema<IGameRating>(
  {
    gameId: { type: String, required: true, index: true },
    gameName: { type: String, required: true },
    userName: { type: String, required: true, default: "Aero Operator" },
    userAvatar: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, required: true },
    review: { type: String, required: true },
    specs: {
      gpu: { type: String, required: true },
      cpu: { type: String, required: true },
      ramGB: { type: Number, required: true },
      resolution: { type: String, default: "1440p" },
      fpsReported: { type: Number, default: 60 },
      os: { type: String, default: "Windows 11" },
      presetUsed: { type: String, default: "Optimal Preset" },
    },
    media: [
      {
        url: { type: String, required: true },
        type: { type: String, enum: ["image", "gif", "video"], default: "image" },
        name: { type: String },
      },
    ],
    recommend: { type: Boolean, default: true },
    upvotes: { type: Number, default: 0 },
    voters: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.models.GameRating ||
  mongoose.model<IGameRating>("GameRating", GameRatingSchema);
