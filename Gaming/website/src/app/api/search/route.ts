import { NextResponse } from "next/server";
import { getSortedPostsData } from "@/lib/blog";
import { getAllDocs } from "@/lib/docs";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim() || "";

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    interface SearchResult {
      title: string;
      type: "docs" | "blog" | "changelog" | "architecture";
      url: string;
      category: string;
      description: string;
    }

    const results: SearchResult[] = [];
    const addedUrls = new Set<string>();

    // 1. Search Documentation (Markdown & MongoDB Cached)
    try {
      const allDocs = await getAllDocs();
      allDocs.forEach((doc) => {
        const titleMatch = doc.title.toLowerCase().includes(query);
        const excerptMatch = doc.excerpt.toLowerCase().includes(query);
        const categoryMatch = doc.category.toLowerCase().includes(query);
        const contentMatch = doc.content?.toLowerCase().includes(query);

        if (titleMatch || excerptMatch || categoryMatch || contentMatch) {
          const docUrl = `/docs/${doc.slug}`;
          if (!addedUrls.has(docUrl)) {
            results.push({
              title: doc.title,
              type: "docs",
              url: docUrl,
              category: `Docs: ${doc.category || "General"}`,
              description: doc.excerpt || doc.title,
            });
            addedUrls.add(docUrl);
          }
        }
      });
    } catch (docErr) {
      console.warn("Docs search fetch fallback error:", docErr);
    }

    // 2. Search MongoDB Gaming Intel Posts
    try {
      await connectDB();
      const dbPosts = await GamingPost.find({
        $or: [
          { title: { $regex: query, $options: "i" } },
          { excerpt: { $regex: query, $options: "i" } },
          { tags: { $regex: query, $options: "i" } },
          { category: { $regex: query, $options: "i" } },
        ],
      }).limit(8).lean();

      dbPosts.forEach((post: any) => {
        const postUrl = `/blog/gaming/${post.slug}`;
        if (!addedUrls.has(postUrl)) {
          results.push({
            title: post.title,
            type: "blog",
            url: postUrl,
            category: post.category || "Gaming Intel",
            description: post.excerpt || "Read full gaming intel dispatch...",
          });
          addedUrls.add(postUrl);
        }
      });
    } catch (mongoErr) {
      console.warn("MongoDB search connection warning: falling back to local posts.");
    }

    // 3. Search Local Blog Posts (MDX Gaming Intel)
    try {
      const blogPosts = getSortedPostsData();
      blogPosts.forEach((post) => {
        const postUrl = `/blog/gaming/${post.id}`;
        if (addedUrls.has(postUrl)) return;

        if (
          post.title.toLowerCase().includes(query) ||
          post.excerpt?.toLowerCase().includes(query) ||
          post.category?.toLowerCase().includes(query)
        ) {
          results.push({
            title: post.title,
            type: "blog",
            url: postUrl,
            category: post.category || "Gaming Intel",
            description: post.excerpt || "Read full gaming intel dispatch...",
          });
          addedUrls.add(postUrl);
        }
      });
    } catch (blogErr) {
      console.warn("Local blog search fallback error:", blogErr);
    }

    // 4. Search Changelogs / Transmission Logs
    const versionFile = path.join(process.cwd(), "..", "backend", "version.json");
    if (fs.existsSync(versionFile)) {
      try {
        const rawData = fs.readFileSync(versionFile, "utf-8");
        const data = JSON.parse(rawData);
        const allChangelogs = data.changelog || [];
        allChangelogs.forEach((log: any) => {
          if (
            log.title?.toLowerCase().includes(query) ||
            log.version?.toLowerCase().includes(query) ||
            log.highlights?.some((h: string) => h.toLowerCase().includes(query))
          ) {
            const changeUrl = `/docs/changes_summary`;
            if (!addedUrls.has(`changelog-${log.version}`)) {
              results.push({
                title: `v${log.version} - ${log.title}`,
                type: "changelog",
                url: changeUrl,
                category: "Transmission Logs",
                description: log.highlights?.[0] || "View detailed version update release notes.",
              });
              addedUrls.add(`changelog-${log.version}`);
            }
          }
        });
      } catch (err) {
        console.error("Failed to parse changelogs in search API", err);
      }
    }

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
