import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import { NodeRegisterSchema, validateRequestBody, handleApiError } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const validation = validateRequestBody(NodeRegisterSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const payload = validation.data;
    await connectDB();

    const nodeId =
      payload.nodeId ||
      payload.node_id ||
      `NODE-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const clerkId = payload.clerkId || payload.clerk_id || "";
    const authProvider = payload.authProvider || payload.auth_provider || "";

    const nodeDoc = await LibraryNode.findOneAndUpdate(
      { nodeId },
      {
        $set: {
          nodeId,
          name: payload.name,
          hostname: payload.hostname || "",
          ip: payload.ip || req.headers.get("x-forwarded-for") || "",
          platform: payload.platform || "win32",
          status: "online",
          authTokenHash: tokenHash,
          clerkId,
          authProvider,
          storage: {
            total: payload.storage?.total || 0,
            used: payload.storage?.used || 0,
            free: payload.storage?.free || 0,
          },
          scanPaths: payload.scanPaths || [],
          version: payload.version || "1.0.0",
          metadata: payload.metadata || {},
          lastHeartbeat: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      nodeId: nodeDoc.nodeId,
      node_id: nodeDoc.nodeId,
      token,
      status: "registered",
    });
  } catch (error) {
    return handleApiError("nodes:register", error, 500, "Failed to register node.");
  }
}
