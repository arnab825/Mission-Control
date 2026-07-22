import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "exe";

  const fallbackMap: Record<string, string> = {
    exe: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Setup.exe",
    msi: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Setup.msi",
    zip: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Portable.zip",
  };

  try {
    const res = await fetch("https://api.github.com/repos/arnab825/Mission-Control/releases/latest", {
      headers: {
        "User-Agent": "MissionControl-Website",
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 300 }, // Cache release info for 5 minutes
    });

    if (!res.ok) {
      const fallbackUrl = fallbackMap[type] || "https://github.com/arnab825/Mission-Control/releases/latest";
      return NextResponse.redirect(fallbackUrl, { status: 302 });
    }

    const data = await res.json();
    const assets = data.assets || [];

    let targetAsset = null;
    const targetExt = type === "zip" ? ".zip" : type === "msi" ? ".msi" : ".exe";

    // 1. First try exact filename match (Portable for zip, Setup for exe/msi)
    const exactName = type === "zip" ? "MissionControl-Portable.zip" : `MissionControl-Setup${targetExt}`;
    targetAsset = assets.find((a: any) => a.name === exactName);

    // 2. Fallback to any asset matching the extension
    if (!targetAsset) {
      targetAsset = assets.find((a: any) => a.name.endsWith(targetExt));
    }

    if (targetAsset && targetAsset.browser_download_url) {
      return NextResponse.redirect(targetAsset.browser_download_url, { status: 302 });
    }

    // 3. Fallback to GitHub releases page if asset missing
    const fallbackUrl = fallbackMap[type] || "https://github.com/arnab825/Mission-Control/releases/latest";
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  } catch (error) {
    console.error("Error fetching release download:", error);
    const fallbackUrl = fallbackMap[type] || "https://github.com/arnab825/Mission-Control/releases/latest";
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }
}
