import mongoose, { Schema, Document } from "mongoose";

export interface IChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface ISupportSession extends Document {
  sessionId: string;
  userEmail: string;
  userName: string;
  gender: string;
  title: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const SupportSessionSchema = new Schema<ISupportSession>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userEmail: { type: String, required: true, index: true },
    userName: { type: String, required: true },
    gender: { type: String, default: "male" },
    title: { type: String, default: "New Support Chat" },
    messages: [
      {
        id: { type: String, required: true },
        sender: { type: String, enum: ["user", "assistant"], required: true },
        text: { type: String, required: true },
        timestamp: { type: String, required: true }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.models.SupportSession ||
  mongoose.model<ISupportSession>("SupportSession", SupportSessionSchema);
