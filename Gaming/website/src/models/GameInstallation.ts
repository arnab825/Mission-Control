import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGameInstallation extends Document {
  nodeId: string;
  title: string;
  store: string;
  storeAppId?: string;
  installPath: string;
  exePath?: string;
  version?: string;
  sizeBytes: number;
  developer?: string;
  publisher?: string;
  releaseDate?: string;
  genres: string[];
  tags: string[];
  features: string[];
  coverUrl?: string;
  bannerUrl?: string;
  summary?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const GameInstallationSchema = new Schema<IGameInstallation>(
  {
    nodeId: { type: String, required: true, index: true },
    title: { type: String, required: true, index: true },
    store: { type: String, default: "manual" },
    storeAppId: { type: String },
    installPath: { type: String, required: true },
    exePath: { type: String },
    version: { type: String },
    sizeBytes: { type: Number, default: 0 },
    developer: { type: String },
    publisher: { type: String },
    releaseDate: { type: String },
    genres: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    features: { type: [String], default: [] },
    coverUrl: { type: String },
    bannerUrl: { type: String },
    summary: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Compound index to quickly find/upsert installation per node and path
GameInstallationSchema.index({ nodeId: 1, installPath: 1 }, { unique: true });

const GameInstallation: Model<IGameInstallation> =
  mongoose.models.GameInstallation ||
  mongoose.model<IGameInstallation>("GameInstallation", GameInstallationSchema);

export default GameInstallation;
