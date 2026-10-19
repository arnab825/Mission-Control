import { NextResponse } from "next/server";
import { getAllDocs } from "@/lib/docs";
import fs from "fs";
import path from "path";
import { handleApiError } from "@/lib/api-validation";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.toLowerCase().trim().slice(0, 100) || "";

    if (!query) {
      return NextResponse.json({ results: [] });
    }

    interface SearchResult {
      title: string;
      type: "docs" | "changelog" | "architecture";
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

    // 2. Search Changelogs / Transmission Logs
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
    return handleApiError("GET /api/search", error, 500, "Failed to perform search.");
  }
}

