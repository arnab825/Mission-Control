import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import GameInstallation from "@/models/GameInstallation";
import { handleApiError } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerk_id") || searchParams.get("clerkId");

    await connectDB();

    const nodeQuery: Record<string, any> = {};
    if (clerkId) {
      nodeQuery.clerkId = clerkId;
    }

    const nodes = await LibraryNode.find(nodeQuery).sort({ updatedAt: -1 }).lean();

    // Mark nodes inactive if heartbeat is older than 60 seconds
    const nowMs = Date.now();
    let onlineCount = 0;
    let totalStorage = 0;
    let usedStorage = 0;

    const formattedNodes = await Promise.all(
      nodes.map(async (n) => {
        const lastHb = n.lastHeartbeat ? new Date(n.lastHeartbeat).getTime() : 0;
        const isOnline = nowMs - lastHb < 60_000;
        if (isOnline) onlineCount += 1;

        const sTotal = n.storage?.total || 0;
        const sUsed = n.storage?.used || 0;
        totalStorage += sTotal;
        usedStorage += sUsed;

        const count = await GameInstallation.countDocuments({ nodeId: n.nodeId });

        return {
          node_id: n.nodeId,
          name: n.name,
          status: isOnline ? "online" : "offline",
          storage_total: sTotal,
          storage_used: sUsed,
          storage_free: n.storage?.free || 0,
          game_count: count,
          last_heartbeat: n.lastHeartbeat?.toISOString(),
          last_sync: n.lastSync?.toISOString() || null,
        };
      })
    );

    const totalInstallations = await GameInstallation.countDocuments(
      clerkId ? { nodeId: { $in: nodes.map((n) => n.nodeId) } } : {}
    );

    return NextResponse.json({
      total_master_games: totalInstallations,
      total_installed_games: totalInstallations,
      total_nodes: nodes.length,
      online_nodes: onlineCount,
      total_storage_bytes: totalStorage,
      used_storage_bytes: usedStorage,
      nodes: formattedNodes,
    });
  } catch (error) {
    return handleApiError("library:stats", error, 500, "Failed to fetch library stats.");
  }
}
