import mongoose, { Schema, Document } from "mongoose";

export interface IGamingPost extends Document {
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  markdownBody: string;
  tags: string[];
  author: string;
  aiGenerated: boolean;
  publishedAt: Date;
  coverImage?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GamingPostSchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    category: { type: String, required: true },
    excerpt: { type: String, required: true },
    markdownBody: { type: String, required: true },
    tags: { type: [String], default: [] },
    author: { type: String, default: "Mission Control Intel" },
    aiGenerated: { type: Boolean, default: true },
    publishedAt: { type: Date, required: true },
    coverImage: { type: String },
  },
  { collection: "missioncontrol", timestamps: true }
);

export default mongoose.models.GamingPost ||
  mongoose.model<IGamingPost>("GamingPost", GamingPostSchema);
