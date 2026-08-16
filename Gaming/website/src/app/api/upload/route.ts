import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Determine media type
    const mime = file.type.toLowerCase();
    let mediaType: "image" | "gif" | "video" = "image";

    if (mime.includes("gif")) {
      mediaType = "gif";
    } else if (mime.startsWith("video/") || mime.includes("mp4") || mime.includes("webm") || mime.includes("quicktime")) {
      mediaType = "video";
    } else if (mime.startsWith("image/")) {
      mediaType = "image";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload an image (.png, .jpg, .webp), GIF, or video (.mp4, .webm)." },
        { status: 400 }
      );
    }

    // Size limit: 25MB
    const MAX_SIZE_BYTES = 25 * 1024 * 1024;
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB limit." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 1. Try Vercel Blob CDN if token configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
        const uniqueKey = `community/${Date.now()}_${cleanName}`;

        let blob;
        try {
          blob = await put(uniqueKey, buffer, {
            access: "public",
            contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
          });
        } catch {
          // If store is private, upload with explicit private access
          blob = await put(uniqueKey, buffer, {
            access: "private" as any,
            contentType: file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg"),
          });
        }

        if (blob?.url) {
          return NextResponse.json({
            url: blob.url,
            type: mediaType,
            name: file.name,
            size: file.size,
          });
        } else if (blob?.pathname) {
          return NextResponse.json({
            url: `/api/blob?pathname=${encodeURIComponent(blob.pathname)}`,
            type: mediaType,
            name: file.name,
            size: file.size,
          });
        }
      } catch (blobErr: any) {
        console.warn("[Upload API] Vercel Blob upload failed, falling back to base64 data URI:", blobErr?.message);
      }
    }

    // 2. Fallback: Base64 Data URL (ensures local dev and offline work 100%)
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${file.type || "application/octet-stream"};base64,${base64Data}`;

    return NextResponse.json({
      url: dataUrl,
      type: mediaType,
      name: file.name,
      size: file.size,
    });
  } catch (error: any) {
    console.error("Error in POST /api/upload:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}
