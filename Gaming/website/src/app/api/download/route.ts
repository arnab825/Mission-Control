import { NextRequest, NextResponse } from "next/server";
import { DownloadTypeSchema } from "@/lib/api-validation";

export const dynamic = "force-dynamic";

const GITHUB_REPO = "arnab825/Mission-Control";
const GITHUB_LATEST_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/latest`;
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

const DIRECT_DOWNLOAD_FALLBACKS: Record<string, string> = {
  exe: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Setup.exe`,
  msi: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Setup.msi`,
  zip: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Portable.zip`,
  appimage: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.AppImage`,
  deb: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.deb`,
  rpm: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.rpm`,
  "tar.gz": `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.tar.gz`,
  tar: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.tar.gz`,
  linux: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Linux.AppImage`,
  windows: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Setup.exe`,
  win: `https://github.com/${GITHUB_REPO}/releases/latest/download/MissionControl-Setup.exe`,
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let rawType = searchParams.get("type");

    // Validate type against strict enum schema if provided
    if (rawType && rawType !== "auto") {
      const parseResult = DownloadTypeSchema.safeParse(rawType.toLowerCase());
      if (!parseResult.success) {
        // Graceful fallback to exe instead of hard 400 for external certifier bots
        rawType = "exe";
      }
    }

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
    const fallbackUrl = DIRECT_DOWNLOAD_FALLBACKS[type] || DIRECT_DOWNLOAD_FALLBACKS.exe || GITHUB_LATEST_RELEASE_URL;

    try {
      // Abort fast (3s) to prevent gateway timeouts on serverless cold starts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
        headers: {
          "User-Agent": "MissionControl-Website",
          Accept: "application/vnd.github.v3+json",
        },
        signal: controller.signal,
        next: { revalidate: 300 }, // Cache release metadata for 5 minutes
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // If GitHub API rate limits (HTTP 403) or fails, use direct CDN download URL
        return NextResponse.redirect(fallbackUrl, { status: 302 });
      }

      const data = await res.json();
      const assets = (data.assets || []) as Array<{ name: string; browser_download_url: string }>;

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

      let targetAsset = null;

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

      // 3. Redirect to asset or direct fallback
      if (targetAsset && targetAsset.browser_download_url) {
        return NextResponse.redirect(targetAsset.browser_download_url, { status: 302 });
      }

      return NextResponse.redirect(fallbackUrl, { status: 302 });
    } catch (apiErr) {
      console.warn("[Download API] GitHub release fetch failed, using fallback URL:", apiErr);
      return NextResponse.redirect(fallbackUrl, { status: 302 });
    }
  } catch (err) {
    console.error("[Download API Fatal Error]", err);
    return NextResponse.redirect(GITHUB_LATEST_RELEASE_URL, { status: 302 });
  }
}

export async function HEAD(request: NextRequest) {
  return GET(request);
}
