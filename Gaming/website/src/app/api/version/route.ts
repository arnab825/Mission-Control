import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/arnab825/Mission-Control/releases/latest",
      {
        headers: {
          "User-Agent": "MissionControl-Website",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );
    if (res.ok) {
      const data = await res.json();
      const version = data.tag_name ? data.tag_name.replace(/^v/, "") : "2.1.7";
      return NextResponse.json({ version });
    }
    return NextResponse.json({ version: "2.1.7" });
  } catch (error) {
    console.error("Failed to fetch latest version from GitHub:", error);
    return NextResponse.json({ version: "2.1.7" });
  }
}
