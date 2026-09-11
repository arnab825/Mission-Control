import { NextResponse } from "next/server";
import { handleApiError } from "@/lib/api-validation";

// ── Binary Magic Byte Validation Helper ──────────────────────────────────────
interface MagicByteValidationResult {
  valid: boolean;
  detectedType?: "image" | "gif" | "video";
  detectedMime?: string;
  error?: string;
}

function validateMediaMagicBytes(buffer: Buffer): MagicByteValidationResult {
  if (buffer.length < 16) {
    return {
      valid: false,
      error: "File buffer is too small to constitute a valid media asset.",
    };
  }

  // 1. Explicitly reject executable binary headers and dangerous script markers
  // Windows Portable Executable (MZ)
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    return { valid: false, error: "Executable binaries (PE/EXE/DLL) are strictly prohibited." };
  }
  // Linux ELF
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return { valid: false, error: "Executable ELF binaries are strictly prohibited." };
  }
  // Script shebang (#!)
  if (buffer[0] === 0x23 && buffer[1] === 0x21) {
    return { valid: false, error: "Script files are strictly prohibited." };
  }

  // Check for common dangerous text/script injection in binary prefixes (<script, <?php, <!doctype, <html)
  const prefixText = buffer.subarray(0, 64).toString("latin1").toLowerCase();
  if (
    prefixText.includes("<script") ||
    prefixText.includes("<?php") ||
    prefixText.includes("<html") ||
    prefixText.includes("<!doctype")
  ) {
    return { valid: false, error: "HTML/Script content is strictly prohibited in uploads." };
  }

  // 2. Validate Genuine Media Magic Bytes

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedType: "image", detectedMime: "image/png" };
  }

  // JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedType: "image", detectedMime: "image/jpeg" };
  }

  // GIF: GIF87a or GIF89a
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedType: "gif", detectedMime: "image/gif" };
  }

  // WebP: RIFF [4 bytes size] WEBP
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedType: "image", detectedMime: "image/webp" };
  }

  // MP4 / MOV: 'ftyp', 'moov', or 'mdat' at offset 4
  const boxType = buffer.subarray(4, 8).toString("latin1");
  if (boxType === "ftyp" || boxType === "moov" || boxType === "mdat") {
    return { valid: true, detectedType: "video", detectedMime: "video/mp4" };
  }

  // WebM / Matroska: 1A 45 DF A3
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { valid: true, detectedType: "video", detectedMime: "video/webm" };
  }

  return {
    valid: false,
    error: "File content failed deep binary inspection: signature does not match allowed image or video formats.",
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // 1. File size boundaries: min 16 bytes, max 25MB
    const MIN_SIZE_BYTES = 16;
    const MAX_SIZE_BYTES = 25 * 1024 * 1024; // 25MB

    if (file.size < MIN_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size is too small to be a valid media asset." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB limit." },
        { status: 400 }
      );
    }

    // 2. Read array buffer and perform deep binary magic-bytes inspection
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const binaryCheck = validateMediaMagicBytes(buffer);
    if (!binaryCheck.valid) {
      return NextResponse.json(
        { error: binaryCheck.error || "File content validation failed." },
        { status: 400 }
      );
    }

    const mediaType = binaryCheck.detectedType || "image";
    const verifiedMime = binaryCheck.detectedMime || "image/jpeg";

    // 3. Sanitize filename: remove directory traversal and illegal characters
    const cleanFileName = (file.name || "upload")
      .replace(/[/\\?%*:|"<>]/g, "_")
      .replace(/\.{2,}/g, ".")
      .replace(/^\.+/, "")
      .trim();

    // 4. Isolated Storage Pipeline:
    // Try Vercel Blob isolated object storage first if configured
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const uniqueKey = `community/${Date.now()}_${cleanFileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

        let blob;
        try {
          blob = await put(uniqueKey, buffer, {
            access: "public",
            contentType: verifiedMime,
          });
        } catch {
          // If store is private, upload with explicit private access
          blob = await put(uniqueKey, buffer, {
            access: "private" as any,
            contentType: verifiedMime,
          });
        }

        if (blob?.url) {
          return NextResponse.json({
            url: blob.url,
            type: mediaType,
            name: cleanFileName,
            size: file.size,
          });
        } else if (blob?.pathname) {
          return NextResponse.json({
            url: `/api/blob?pathname=${encodeURIComponent(blob.pathname)}`,
            type: mediaType,
            name: cleanFileName,
            size: file.size,
          });
        }
      } catch (blobErr: unknown) {
        console.warn("[Upload API] Vercel Blob upload failed, falling back to base64 data URI:", blobErr);
      }
    }

    // 5. Fallback: Base64 Data URI outside local web root (zero execution risk)
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${verifiedMime};base64,${base64Data}`;

    return NextResponse.json({
      url: dataUrl,
      type: mediaType,
      name: cleanFileName,
      size: file.size,
    });
  } catch (error: unknown) {
    return handleApiError("POST /api/upload", error, 500, "Failed to process media upload.");
  }
}
