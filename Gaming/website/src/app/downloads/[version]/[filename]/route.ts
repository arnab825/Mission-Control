import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "arnab825/Mission-Control";

async function handleDownload(
  request: NextRequest,
  version: string,
  filename: string
): Promise<Response> {
  const targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/${version}/${filename}`;

  const forwardHeaders = new Headers();
  forwardHeaders.set(
    "User-Agent",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) MissionControlWebsiteProxy/3.6.3"
  );
  if (request.headers.has("range")) {
    forwardHeaders.set("range", request.headers.get("range")!);
  }

  try {
    // Step 1: Follow GitHub 302 redirect manually to retrieve true storage CDN URL
    const ghRes = await fetch(targetUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: forwardHeaders,
      redirect: "manual",
    });

    let downloadUrl = targetUrl;
    if (ghRes.status === 301 || ghRes.status === 302) {
      const location = ghRes.headers.get("location");
      if (location) {
        downloadUrl = location;
      }
    }

    // Step 2: Fetch directly from storage CDN without client redirection
    const cdnRes = await fetch(downloadUrl, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers: forwardHeaders,
      redirect: "follow",
    });

    // Step 3: Mirror standard download headers for Microsoft Store validation
    const responseHeaders = new Headers();
    const mirrorKeys = [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "last-modified",
      "etag",
      "cache-control",
    ];

    for (const key of mirrorKeys) {
      if (cdnRes.headers.has(key)) {
        responseHeaders.set(key, cdnRes.headers.get(key)!);
      }
    }

    if (!responseHeaders.has("content-type")) {
      responseHeaders.set("content-type", "application/octet-stream");
    }
    responseHeaders.set("content-disposition", `attachment; filename="${filename}"`);
    responseHeaders.set("access-control-allow-origin", "*");

    return new Response(request.method === "HEAD" ? null : cdnRes.body, {
      status: cdnRes.status,
      statusText: cdnRes.statusText,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return new Response(`Proxy Error: ${errorMsg}`, {
      status: 502,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ version: string; filename: string }> }
) {
  const { version, filename } = await context.params;
  return handleDownload(request, version, filename);
}

export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ version: string; filename: string }> }
) {
  const { version, filename } = await context.params;
  return handleDownload(request, version, filename);
}
