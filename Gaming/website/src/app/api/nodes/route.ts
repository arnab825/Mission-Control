import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import { handleApiError } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clerkId = searchParams.get("clerk_id") || searchParams.get("clerkId");

    await connectDB();

    const query: Record<string, any> = {};
    if (clerkId) {
      query.clerkId = clerkId;
    }

    const nodes = await LibraryNode.find(query).sort({ updatedAt: -1 }).lean();

    const formatted = nodes.map((n) => ({
      node_id: n.nodeId,
      name: n.name,
      hostname: n.hostname,
      ip: n.ip,
      platform: n.platform,
      status: n.status,
      clerk_id: n.clerkId,
      auth_provider: n.authProvider,
      storage_total: n.storage?.total || 0,
      storage_used: n.storage?.used || 0,
      storage_free: n.storage?.free || 0,
      scan_paths: n.scanPaths || [],
      last_heartbeat: n.lastHeartbeat?.toISOString(),
      last_sync: n.lastSync?.toISOString() || null,
      version: n.version,
      metadata: n.metadata,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    return handleApiError("nodes:list", error, 500, "Failed to fetch library nodes.");
  }
}
