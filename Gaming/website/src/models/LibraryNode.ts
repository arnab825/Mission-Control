import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILibraryNode extends Document {
  nodeId: string;
  name: string;
  hostname?: string;
  ip?: string;
  platform?: string;
  status: "online" | "offline" | "syncing";
  authTokenHash?: string;
  clerkId?: string;
  authProvider?: string;
  storage: {
    total: number;
    used: number;
    free: number;
  };
  scanPaths: string[];
  lastHeartbeat: Date;
  lastSync?: Date;
  version?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const LibraryNodeSchema = new Schema<ILibraryNode>(
  {
    nodeId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    hostname: { type: String, default: "" },
    ip: { type: String, default: "" },
    platform: { type: String, default: "unknown" },
    status: { type: String, enum: ["online", "offline", "syncing"], default: "online" },
    authTokenHash: { type: String, default: "" },
    clerkId: { type: String, default: "", index: true },
    authProvider: { type: String, default: "" },
    storage: {
      total: { type: Number, default: 0 },
      used: { type: Number, default: 0 },
      free: { type: Number, default: 0 },
    },
    scanPaths: { type: [String], default: [] },
    lastHeartbeat: { type: Date, default: Date.now },
    lastSync: { type: Date },
    version: { type: String, default: "1.0.0" },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const LibraryNode: Model<ILibraryNode> =
  mongoose.models.LibraryNode || mongoose.model<ILibraryNode>("LibraryNode", LibraryNodeSchema);

export default LibraryNode;
