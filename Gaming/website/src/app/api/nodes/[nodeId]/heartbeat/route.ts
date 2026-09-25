import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import { NodeHeartbeatSchema, validateRequestBody, handleApiError } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    if (!nodeId) {
      return NextResponse.json({ error: "Missing node ID" }, { status: 400 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const validation = validateRequestBody(NodeHeartbeatSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const payload = validation.data;
    await connectDB();

    const clientIp = payload.ip || req.headers.get("x-forwarded-for") || "";

    const updatedNode = await LibraryNode.findOneAndUpdate(
      { nodeId },
      {
        $set: {
          status: payload.status || "online",
          ip: clientIp,
          "storage.total": payload.storage?.total ?? 0,
          "storage.used": payload.storage?.used ?? 0,
          "storage.free": payload.storage?.free ?? 0,
          lastHeartbeat: new Date(),
        },
      },
      { new: true }
    );

    if (!updatedNode) {
      // If node wasn't registered yet, signal 401 so the node client auto-registers
      return NextResponse.json(
        { error: "Node not registered", _status_code: 401 },
        { status: 401 }
      );
    }

    return NextResponse.json({
      received: true,
      status: "ok",
      command: null,
    });
  } catch (error) {
    return handleApiError("nodes:heartbeat", error, 500, "Failed to record heartbeat.");
  }
}
