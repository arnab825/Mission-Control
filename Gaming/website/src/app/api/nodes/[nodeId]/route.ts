import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import GameInstallation from "@/models/GameInstallation";
import { handleApiError } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await params;
    await connectDB();

    const node = await LibraryNode.findOne({ nodeId }).lean();
    if (!node) {
      return NextResponse.json({ error: `Node ${nodeId} not found` }, { status: 404 });
    }

    const gameCount = await GameInstallation.countDocuments({ nodeId });

    return NextResponse.json({
      node_id: node.nodeId,
      name: node.name,
      hostname: node.hostname,
      ip: node.ip,
      platform: node.platform,
      status: node.status,
      clerk_id: node.clerkId,
      auth_provider: node.authProvider,
      storage_total: node.storage?.total || 0,
      storage_used: node.storage?.used || 0,
      storage_free: node.storage?.free || 0,
      scan_paths: node.scanPaths || [],
      game_count: gameCount,
      last_heartbeat: node.lastHeartbeat?.toISOString(),
      last_sync: node.lastSync?.toISOString() || null,
      version: node.version,
      metadata: node.metadata,
    });
  } catch (error) {
    return handleApiError("nodes:get", error, 500, "Failed to fetch node details.");
  }
}
