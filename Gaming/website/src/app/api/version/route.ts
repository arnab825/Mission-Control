import { NextResponse } from "next/server";
import { APP_VERSION } from "@/lib/version";

export const revalidate = 300;

export async function GET() {
  try {
    const res = await fetch(
      "https://api.github.com/repos/arnab825/Mission-Control/releases/latest",
      {
        headers: {
          "User-Agent": "MissionControl-Website",
        },
        signal: AbortSignal.timeout(2000),
        next: { revalidate: 300 }, // Cache for 5 minutes
      }
    );
    if (res.ok) {
      const data = await res.json();
      const version = data.tag_name ? data.tag_name.replace(/^v/, "") : APP_VERSION;
      return NextResponse.json({ version });
    }
    return NextResponse.json({ version: APP_VERSION });
  } catch (error) {
    return NextResponse.json({ version: APP_VERSION });
  }
}
