import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/arnab825/Mission-Control/releases/latest",
      {
        headers: {
          "User-Agent": "MissionControl-Website",
        },
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );
    if (res.ok) {
      const data = await res.json();
      const version = data.tag_name ? data.tag_name.replace(/^v/, "") : "2.9.4";
      return NextResponse.json({ version });
    }
    return NextResponse.json({ version: "2.9.4" });
  } catch (error) {
    return NextResponse.json({ version: "2.9.4" });
  }
}
