import mongoose, { Schema, Document } from "mongoose";

export interface IDoc extends Document {
  slug: string;
  title: string;
  content: string;
  category: string;
  excerpt: string;
  badge?: string;
  badgeColor?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocSchema = new Schema<IDoc>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, required: true },
    excerpt: { type: String, default: "" },
    badge: { type: String },
    badgeColor: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Doc || mongoose.model<IDoc>("Doc", DocSchema);
