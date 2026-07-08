import fs from "fs";
import path from "path";
import matter from "gray-matter";

// The docs directory is at the Gaming root (c:\GitHub\AiAssistant\Gaming\docs)
const docsDirectory = path.join(process.cwd(), "..", "docs");

export interface DocData {
  slug: string;
  title: string;
  content: string;
  category: string;
  excerpt: string;
  badge?: string;
  badgeColor?: string;
}

export function getAllDocs(): DocData[] {
  if (!fs.existsSync(docsDirectory)) return [];

  const fileNames = fs.readdirSync(docsDirectory);
  
  const allDocs = fileNames
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, "").toLowerCase();
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");

      // We will parse with gray-matter just in case they ever add yaml frontmatter,
      // but we will also try to extract the first heading as the title if frontmatter title is missing.
      const matterResult = matter(fileContents);
      let title = matterResult.data.title;
      let category = matterResult.data.category || "Documentation";
      let content = matterResult.content;
      let excerpt = matterResult.data.excerpt || "";
      let badge = matterResult.data.badge || "";
      let badgeColor = matterResult.data.badgeColor || "";

      if (!title) {
        // Try to find the first H1
        const match = content.match(/^#\s+(.*)/m);
        if (match) {
          title = match[1].trim();
          // Remove the H1 from content so we don't duplicate it in the UI
          content = content.replace(/^#\s+(.*)/m, "").trim();
        } else {
          // Fallback title based on filename
          title = slug.replace(/_/g, " ").replace(/-/g, " ").toUpperCase();
        }
      }

      if (!excerpt) {
        // Grab the first paragraph
        const paragraphs = content.split(/\n\n/);
        for (let p of paragraphs) {
          p = p.trim();
          if (p && !p.startsWith("#") && !p.startsWith("-") && !p.startsWith("*")) {
            // Strip any markdown formatting like ** or _
            const plain = p.replace(/[*_#`\[\]()]/g, "");
            excerpt = plain.substring(0, 160);
            if (plain.length > 160) excerpt += "...";
            break;
          }
        }
      }

      return {
        slug,
        title,
        content,
        category,
        excerpt,
        badge,
        badgeColor,
      };
    });

  return allDocs;
}

export function getDocBySlug(slug: string): DocData | null {
  const allDocs = getAllDocs();
  return allDocs.find((doc) => doc.slug === slug) || null;
}
