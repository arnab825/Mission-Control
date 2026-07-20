import mongoose, { Schema, Document } from "mongoose";

export interface IIssue extends Document {
  title: string;
  description: string;
  category: "hardware" | "glitch" | "performance" | "other";
  game?: string;
  votes: number;
  createdAt: Date;
  updatedAt: Date;
  specs: {
    os: string;
    osVersion: string;
    cpu: string;
    gpu: string;
    gpuDriver?: string;
    ramGB: number;
    appVersion: string;
  };
}

const IssueSchema = new Schema<IIssue>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: { type: String, enum: ["hardware", "glitch", "performance", "other"], required: true },
    game: { type: String, default: "General System" },
    votes: { type: Number, default: 1 },
    specs: {
      os: { type: String, required: true },
      osVersion: { type: String, required: true },
      cpu: { type: String, required: true },
      gpu: { type: String, required: true },
      gpuDriver: { type: String, default: "Unknown" },
      ramGB: { type: Number, required: true },
      appVersion: { type: String, required: true },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Issue || mongoose.model<IIssue>("Issue", IssueSchema);
