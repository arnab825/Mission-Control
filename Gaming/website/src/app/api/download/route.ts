import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let rawType = searchParams.get("type");

  // Automatic OS detection if type is unspecified or auto
  if (!rawType || rawType === "auto") {
    const userAgent = (request.headers.get("user-agent") || "").toLowerCase();
    if (userAgent.includes("linux") || userAgent.includes("x11")) {
      rawType = "appimage";
    } else {
      rawType = "exe";
    }
  }

  const type = rawType.toLowerCase();

  const fallbackMap: Record<string, string> = {
    exe: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Setup.exe",
    msi: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Setup.msi",
    zip: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Portable.zip",
    appimage: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.AppImage",
    deb: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.deb",
    rpm: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.rpm",
    "tar.gz": "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.tar.gz",
    tar: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.tar.gz",
    linux: "https://github.com/arnab825/Mission-Control/releases/latest/download/MissionControl-Linux.AppImage",
  };

  const fallbackUrl = fallbackMap[type] || fallbackMap.exe || "https://github.com/arnab825/Mission-Control/releases/latest";

  try {
    const res = await fetch("https://api.github.com/repos/arnab825/Mission-Control/releases/latest", {
      headers: {
        "User-Agent": "MissionControl-Website",
        Accept: "application/vnd.github.v3+json",
      },
      next: { revalidate: 300 }, // Cache release info for 5 minutes
    });

    if (!res.ok) {
      return NextResponse.redirect(fallbackUrl, { status: 302 });
    }

    const data = await res.json();
    const assets = (data.assets || []) as Array<{ name: string; browser_download_url: string }>;

    let targetAsset = null;

    // 1. Precise type/name matching
    targetAsset = assets.find((a) => {
      const name = (a.name || "").toLowerCase();
      if (type === "zip") {
        return name === "missioncontrol-portable.zip" || name.includes("portable.zip");
      }
      if (type === "msi") {
        return name === "missioncontrol-setup.msi" || (name.includes("setup") && name.endsWith(".msi"));
      }
      if (type === "exe") {
        return name === "missioncontrol-setup.exe" || (name.includes("setup") && name.endsWith(".exe"));
      }
      if (type === "appimage" || type === "linux") {
        return name.endsWith(".appimage");
      }
      if (type === "deb") {
        return name.endsWith(".deb");
      }
      if (type === "rpm") {
        return name.endsWith(".rpm");
      }
      if (type === "tar.gz" || type === "tar" || type === "tgz") {
        return name.endsWith(".tar.gz") || name.endsWith(".tgz");
      }
      return false;
    });

    // 2. Generic extension matching fallback
    if (!targetAsset) {
      const extMap: Record<string, string> = {
        zip: ".zip",
        msi: ".msi",
        exe: ".exe",
        appimage: ".appimage",
        linux: ".appimage",
        deb: ".deb",
        rpm: ".rpm",
        "tar.gz": ".tar.gz",
        tar: ".tar.gz",
        tgz: ".tgz",
      };
      const ext = extMap[type] || `.${type}`;
      targetAsset = assets.find((a) => (a.name || "").toLowerCase().endsWith(ext));
    }

    if (targetAsset && targetAsset.browser_download_url) {
      return NextResponse.redirect(targetAsset.browser_download_url, { status: 302 });
    }

    // 3. Fallback to direct URL or GitHub releases page
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  } catch (error) {
    console.error("Error fetching release download:", error);
    return NextResponse.redirect(fallbackUrl, { status: 302 });
  }
}
