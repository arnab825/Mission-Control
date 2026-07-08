import { NextResponse } from "next/server";

const GAMING_RSS_FEEDS = [
  { url: "https://www.ign.com/feeds/news.xml", label: "IGN", type: "gaming" },
  { url: "https://kotaku.com/rss", label: "Kotaku", type: "gaming" },
  { url: "https://www.eurogamer.net/?format=rss", label: "Eurogamer", type: "gaming" },
  { url: "https://feeds.anandtech.com/anandtech/anandtech.xml", label: "AnandTech", type: "hardware" },
  { url: "https://www.tomshardware.com/feeds/all", label: "Tom's Hardware", type: "hardware" },
];

async function fetchRSSFeed(feedUrl: string, label: string, type: string) {
  try {
    const response = await fetch(feedUrl, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return { items: [], label, type };
    const xml = await response.text();

    const items: { title: string; link: string; description: string; source: string; type: string }[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
      const block = match[1];
      const title = (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ||
        /<title>(.*?)<\/title>/.exec(block))?.[1]?.trim() ?? "";
      const link = (/<link>(.*?)<\/link>/.exec(block) ||
        /<link href="(.*?)"/.exec(block))?.[1]?.trim() ?? "";
      const desc = (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) ||
        /<description>(.*?)<\/description>/.exec(block))?.[1]
        ?.replace(/<[^>]*>/g, "")
        ?.trim()
        ?.slice(0, 300) ?? "";
      const pubDate = (/<pubDate>(.*?)<\/pubDate>/.exec(block))?.[1]?.trim() ?? "";
      if (title) items.push({ title, link, description: desc, source: label, type });
    }
    return { items, label, type };
  } catch {
    return { items: [], label, type, error: true };
  }
}

export async function GET() {
  const feedResults = await Promise.allSettled(
    GAMING_RSS_FEEDS.map((f) => fetchRSSFeed(f.url, f.label, f.type))
  );

  const feeds = feedResults.map((r) =>
    r.status === "fulfilled" ? r.value : { items: [], label: "Error", type: "unknown", error: true }
  );

  const allItems = feeds.flatMap((f) => f.items);

  return NextResponse.json({
    totalItems: allItems.length,
    feeds: feeds.map((f) => ({ label: f.label, type: f.type, count: f.items.length })),
    items: allItems,
  });
}
