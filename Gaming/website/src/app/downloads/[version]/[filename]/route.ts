import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "arnab825/Mission-Control";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ version: string; filename: string }> }
) {
  const { version, filename } = await context.params;
  const cleanVersion = encodeURIComponent(version.trim());
  const cleanFilename = encodeURIComponent(filename.trim());
  const targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/${cleanVersion}/${cleanFilename}`;

  // Direct 302 Redirect to GitHub Releases CDN (objects.githubusercontent.com)
  // This bypasses serverless origin streaming completely, ensuring 0 MB of bandwidth is burned on Vercel.
  return NextResponse.redirect(targetUrl, { status: 302 });
}


export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ version: string; filename: string }> }
) {
  const { version, filename } = await context.params;
  const cleanVersion = encodeURIComponent(version.trim());
  const cleanFilename = encodeURIComponent(filename.trim());
  const targetUrl = `https://github.com/${GITHUB_REPO}/releases/download/${cleanVersion}/${cleanFilename}`;

  return NextResponse.redirect(targetUrl, { status: 302 });
}
