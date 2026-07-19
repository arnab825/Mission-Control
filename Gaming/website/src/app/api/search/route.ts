import { NextResponse } from "next/server";
import { getSortedPostsData } from "@/lib/blog";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

// Static Docs index topics to allow search support before Sanity release
const STATIC_DOCS = [
  {
    title: "Sanity CMS Integration Setup",
    slug: "setup",
    category: "Installation",
    excerpt: "Learn how to link Sanity CMS headless studio to manage documents locally.",
  },
  {
    title: "VRAM Allocation Optimizer",
    slug: "vram",
    category: "Commands",
    excerpt: "Use the /vram command to flush graphics caches and release system memory.",
  },
  {
    title: "Stealth Boost Performance Mode",
    slug: "boost",
    category: "Configuration",
    excerpt: "Toggle stealth boost to suspend launcher processes and maximize game frame rate.",
  },
  {
    title: "NVIDIA Telemetry Deep Scanner",
    slug: "scan",
    category: "Telemetry",
    excerpt: "Scan project directories automatically for Reflex, DLSS, and Frame Generation dependencies.",
  },
  {
    title: "Hotkeys & Shortcuts Binding",
    slug: "shortcuts",
    category: "Configuration",
    excerpt: "Configure Ctrl + Grave hotkeys to instantly trigger the overlay viewport.",
  },
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase() || "";

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    interface SearchResult {
      title: string;
      type: string;
      url: string;
      category: string;
      description: string;
    }

    const results: SearchResult[] = [];
    const addedUrls = new Set<string>();

    interface DBPostDoc {
      title: string;
      slug: string;
      category?: string;
      excerpt?: string;
    }

    // 1. Search MongoDB Gaming Posts
    try {
      await connectDB();
      const dbPosts = (await GamingPost.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { excerpt: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } }
        ]
      }).lean()) as unknown as DBPostDoc[];

      dbPosts.forEach((post) => {
        results.push({
          title: post.title,
          type: "blog",
          url: `/blog/gaming/${post.slug}`,
          category: post.category || "Gaming Intel",
          description: post.excerpt || "Read full article...",
        });
        addedUrls.add(post.slug);
      });
    } catch (error) {
      console.warn("MongoDB Search Connection Error: IP not whitelisted. Falling back to local posts.");
    }

    // 2. Search Local Blog Posts (MDX Gaming Intel)
    const blogPosts = getSortedPostsData();
    blogPosts.forEach((post) => {
      if (addedUrls.has(post.id)) return;

      if (
        post.title.toLowerCase().includes(query) ||
        post.excerpt?.toLowerCase().includes(query)
      ) {
        results.push({
          title: post.title,
          type: "blog",
          url: `/blog/gaming/${post.id}`,
          category: post.category || "Gaming Intel",
          description: post.excerpt || "Read full article...",
        });
        addedUrls.add(post.id);
      }
    });

    interface ChangelogItem {
      version: string;
      date: string;
      title: string;
      highlights?: string[];
    }

    // 2. Search Changelogs / Transmission Logs
    const versionFile = path.join(process.cwd(), "../backend/version.json");
    if (fs.existsSync(versionFile)) {
      try {
        const rawData = fs.readFileSync(versionFile, "utf-8");
        const data = JSON.parse(rawData);
        const allChangelogs = (data.changelog || []) as ChangelogItem[];
        const now = new Date();
        const changelogs = allChangelogs.filter((log) => new Date(log.date) <= now);
        changelogs.forEach((log) => {
          if (
            log.title.toLowerCase().includes(query) ||
            log.version.toLowerCase().includes(query) ||
            log.highlights?.some((h) => h.toLowerCase().includes(query))
          ) {
            results.push({
              title: `v${log.version} - ${log.title}`,
              type: "changelog",
              url: `/blog/${log.version}`,
              category: "Transmission Logs",
              description: log.highlights?.[0] || "View patch logs.",
            });
          }
        });
      } catch (err) {
        console.error("Failed to parse changelogs in search API", err);
      }
    }

    // 3. Search Static Docs topics
    STATIC_DOCS.forEach((doc) => {
      if (
        doc.title.toLowerCase().includes(query) ||
        doc.excerpt.toLowerCase().includes(query) ||
        doc.category.toLowerCase().includes(query)
      ) {
        results.push({
          title: doc.title,
          type: "docs",
          url: `/docs#${doc.slug}`,
          category: `Docs: ${doc.category}`,
          description: doc.excerpt,
        });
      }
    });

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error("Search API failed:", error);
    const message = error instanceof Error ? error.message : "Search query failed.";
    return NextResponse.json(
      { error: "Search query failed.", details: message },
      { status: 500 }
    );
  }
}
