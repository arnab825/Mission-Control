import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import LibraryNode from "@/models/LibraryNode";
import GameInstallation from "@/models/GameInstallation";
import { NodeSyncSchema, validateRequestBody, handleApiError } from "@/lib/api-validation";

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
    const validation = validateRequestBody(NodeSyncSchema, rawBody);
    if (!validation.success) {
      return validation.response;
    }

    const { installations } = validation.data;
    await connectDB();

    const node = await LibraryNode.findOne({ nodeId });
    if (!node) {
      return NextResponse.json(
        { error: "Node not registered", _status_code: 401 },
        { status: 401 }
      );
    }

    let syncedCount = 0;
    let newGamesCount = 0;

    if (installations && installations.length > 0) {
      const bulkOps = installations.map((item) => {
        const installPath = item.installPath || item.install_path || item.title;
        const sizeBytes = item.sizeBytes ?? item.size_bytes ?? 0;
        const storeAppId = item.storeAppId || item.store_app_id ? String(item.storeAppId || item.store_app_id) : undefined;
        const exePath = item.exePath || item.exe_path || undefined;
        const coverUrl = item.coverUrl || item.cover_url || undefined;
        const bannerUrl = item.bannerUrl || item.banner_url || undefined;
        const releaseDate = item.releaseDate || item.release_date || undefined;

        return {
          updateOne: {
            filter: { nodeId, installPath },
            update: {
              $set: {
                nodeId,
                title: item.title,
                store: item.store || "manual",
                storeAppId,
                installPath,
                exePath,
                version: item.version || undefined,
                sizeBytes,
                developer: item.developer || undefined,
                publisher: item.publisher || undefined,
                releaseDate,
                genres: item.genres || [],
                tags: item.tags || [],
                features: item.features || [],
                coverUrl,
                bannerUrl,
                summary: item.summary || undefined,
                metadata: item.metadata || {},
              },
            },
            upsert: true,
          },
        };
      });

      const bulkRes = await GameInstallation.bulkWrite(bulkOps, { ordered: false });
      syncedCount = installations.length;
      newGamesCount = bulkRes.upsertedCount || 0;
    }

    await LibraryNode.updateOne(
      { nodeId },
      { $set: { lastSync: new Date(), status: "online" } }
    );

    return NextResponse.json({
      status: "ok",
      synced: syncedCount,
      new_games: newGamesCount,
      ai_queued: 0,
      errors: 0,
    });
  } catch (error) {
    return handleApiError("nodes:sync", error, 500, "Failed to sync node library.");
  }
}
