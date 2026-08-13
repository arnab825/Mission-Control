import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let pathname = searchParams.get("pathname");
  const rawUrl = searchParams.get("url");

  if (!pathname && rawUrl) {
    try {
      const parsedUrl = new URL(rawUrl);
      pathname = parsedUrl.pathname.replace(/^\//, "");
    } catch {
      pathname = rawUrl;
    }
  }

  if (!pathname) {
    return NextResponse.json({ error: "Missing pathname parameter" }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN not configured" }, { status: 500 });
  }

  try {
    const { get } = await import("@vercel/blob");
    const result = (await get(pathname, {
      access: "private",
      token,
    })) as any;

    if (!result || result.statusCode !== 200 || (!result.stream && !result.blobContentStream)) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    const stream = result.stream || result.blobContentStream;
    let contentType =
      result.contentType ||
      result.blobContentType ||
      (result.headers?.get ? result.headers.get("content-type") : null);

    if (!contentType) {
      if (pathname.endsWith(".svg")) {
        contentType = "image/svg+xml";
      } else if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
        contentType = "image/jpeg";
      } else if (pathname.endsWith(".webp")) {
        contentType = "image/webp";
      } else {
        contentType = "image/png";
      }
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", contentType);
    responseHeaders.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(stream, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error(`[BlobProxy] Error fetching blob "${pathname}":`, err?.message || err);
    return NextResponse.json({ error: "Failed to stream blob", details: err?.message }, { status: 500 });
  }
}
