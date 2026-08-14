import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let rawType = searchParams.get("type");

  // Automatic OS detection if type is unspecified or auto
  if (!rawType || rawType === "auto") {
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    if (userAgent.includes("linux") || userAgent.includes("x11")) {
      rawType = "linux";
    } else {
      rawType = "exe";
    }
  }

  const type = rawType.toLowerCase();
  const GITHUB_RELEASES_URL = "https://github.com/arnab825/Mission-Control/releases";

  try {
    const res = await fetch("https://api.github.com/repos/arnab825/Mission-Control/releases/latest", {
      headers: {
        "User-Agent": "MissionControl-Website",
        Accept: "application/vnd.github.v3+json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.redirect(GITHUB_RELEASES_URL, { status: 302 });
    }

    const data = await res.json();
    const assets = (data.assets || []) as Array<{ name: string; browser_download_url: string }>;

    let targetAsset = null;

    // Helper functions for matching
    const isLinuxAsset = (name: string) => {
      const n = name.toLowerCase();
      return (
        n.endsWith(".appimage") ||
        n.endsWith(".deb") ||
        n.endsWith(".rpm") ||
        n.endsWith(".tar.gz") ||
        n.endsWith(".tgz") ||
        (n.includes("linux") && n.endsWith(".zip"))
      );
    };

    const isWinAsset = (name: string) => {
      const n = name.toLowerCase();
      return (
        n.endsWith(".exe") ||
        n.endsWith(".msi") ||
        (n.endsWith(".zip") && !n.includes("linux"))
      );
    };

    // 1. Precise type matching
    if (type === "appimage") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".appimage"));
    } else if (type === "deb") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".deb"));
    } else if (type === "rpm") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".rpm"));
    } else if (type === "tar.gz" || type === "tar" || type === "tgz") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".tar.gz") || a.name.toLowerCase().endsWith(".tgz"));
    } else if (type === "linux-zip" || type === "linux_zip") {
      targetAsset = assets.find((a) => a.name.toLowerCase().includes("linux") && a.name.toLowerCase().endsWith(".zip"));
    } else if (type === "linux") {
      // Prioritize AppImage > tar.gz > deb > rpm > linux-zip
      targetAsset =
        assets.find((a) => a.name.toLowerCase().endsWith(".appimage")) ||
        assets.find((a) => a.name.toLowerCase().endsWith(".tar.gz") || a.name.toLowerCase().endsWith(".tgz")) ||
        assets.find((a) => a.name.toLowerCase().endsWith(".deb")) ||
        assets.find((a) => a.name.toLowerCase().endsWith(".rpm")) ||
        assets.find((a) => a.name.toLowerCase().includes("linux") && a.name.toLowerCase().endsWith(".zip")) ||
        assets.find((a) => isLinuxAsset(a.name));
    } else if (type === "exe") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".exe"));
    } else if (type === "msi") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".msi"));
    } else if (type === "zip" || type === "win-zip") {
      targetAsset = assets.find((a) => a.name.toLowerCase().endsWith(".zip") && !a.name.toLowerCase().includes("linux"));
    } else if (type === "windows" || type === "win") {
      targetAsset =
        assets.find((a) => a.name.toLowerCase().endsWith(".exe")) ||
        assets.find((a) => a.name.toLowerCase().endsWith(".msi")) ||
        assets.find((a) => isWinAsset(a.name));
    }

    // 2. Generic fallback within OS family
    if (!targetAsset) {
      if (type.includes("linux") || ["appimage", "deb", "rpm", "tar.gz", "tar", "tgz"].includes(type)) {
        targetAsset = assets.find((a) => isLinuxAsset(a.name));
      } else if (type.includes("win") || ["exe", "msi", "zip"].includes(type)) {
        targetAsset = assets.find((a) => isWinAsset(a.name));
      }
    }

    // 3. Redirect to asset or release page
    if (targetAsset && targetAsset.browser_download_url) {
      return NextResponse.redirect(targetAsset.browser_download_url, { status: 302 });
    }

    // If no assets matched at all, redirect to GitHub releases page (never 404)
    return NextResponse.redirect(GITHUB_RELEASES_URL, { status: 302 });
  } catch (error) {
    console.error("Error fetching release download:", error);
    return NextResponse.redirect(GITHUB_RELEASES_URL, { status: 302 });
  }
}
