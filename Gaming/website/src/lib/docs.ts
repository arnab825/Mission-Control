import connectDB from "./mongodb";
import DocModel from "@/models/Doc";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

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

const DOCS_ORDER = [
  "summary",
  "changes_summary",
  "design",
  "process",
  "agentic_logic",
  "agents",
  "nvidia_ai_guide",
  "nvidia",
  "fps",
  "productroadmap",
  "electronroadmap",
  "aero_ai_full_prompt",
  "patchesfile"
];

const METADATA_FALLBACKS: Record<string, { category?: string; title?: string; badge?: string; badgeColor?: string }> = {
  "summary": { category: "Overview", title: "Project Summary", badge: "Core", badgeColor: "text-neon-green" },
  "changes_summary": { category: "Overview", title: "Recent Updates" },
  "design": { category: "Architecture", title: "System Architecture" },
  "process": { category: "Architecture", title: "Process & Threading" },
  "agentic_logic": { category: "Core Logic", title: "Agentic AI Controller" },
  "agents": { category: "Core Logic", title: "AI Personalities" },
  "nvidia_ai_guide": { category: "Integrations", title: "NVIDIA NIM Guide" },
  "nvidia": { category: "Integrations", title: "NVIDIA Integration" },
  "fps": { category: "Performance", title: "FPS & VRAM Optimization" },
  "patchesfile": { category: "Reference", title: "Patches & Version History" },
  "aero_ai_full_prompt": { category: "Reference", title: "Aero AI Prompt" },
  "electronroadmap": { category: "Roadmaps", title: "Electron App Roadmap" },
  "productroadmap": { category: "Roadmaps", title: "Product Roadmap" },
};

export async function getAllDocs(): Promise<DocData[]> {
  try {
    await connectDB();
    let docs = await DocModel.find({}).sort({ order: 1 }).lean();
    
    if (docs.length === 0) {
      console.log("Docs collection is empty. Attempting to seed from filesystem...");
      const fileDocs: any[] = [];
      
      if (fs.existsSync(docsDirectory)) {
        const fileNames = fs.readdirSync(docsDirectory);
        fileNames
          .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
          .forEach((fileName) => {
            const slug = fileName.replace(/\.mdx?$/, "").toLowerCase();
            const fullPath = path.join(docsDirectory, fileName);
            const fileContents = fs.readFileSync(fullPath, "utf8");
            const matterResult = matter(fileContents);
            const fallback = METADATA_FALLBACKS[slug] || {};
            
            let title = matterResult.data.title || fallback.title;
            let category = matterResult.data.category || fallback.category || "Documentation";
            let content = matterResult.content;
            let excerpt = matterResult.data.excerpt || "";
            let badge = matterResult.data.badge || fallback.badge || "";
            let badgeColor = matterResult.data.badgeColor || fallback.badgeColor || "";

            if (!title) {
              const match = content.match(/^#\s+(.*)/m);
              if (match) {
                title = match[1].trim();
                content = content.replace(/^#\s+(.*)/m, "").trim();
              } else {
                title = slug.replace(/_/g, " ").replace(/-/g, " ").toUpperCase();
              }
            }

            if (!excerpt) {
              const paragraphs = content.split(/\n\n/);
              for (let p of paragraphs) {
                p = p.trim();
                if (p && !p.startsWith("#") && !p.startsWith("-") && !p.startsWith("*")) {
                  const plain = p.replace(/[*_#`\[\]()]/g, "");
                  excerpt = plain.substring(0, 160);
                  if (plain.length > 160) excerpt += "...";
                  break;
                }
              }
            }
            
            const order = DOCS_ORDER.indexOf(slug) === -1 ? 999 : DOCS_ORDER.indexOf(slug);
            
            fileDocs.push({
              slug,
              title,
              content,
              category,
              excerpt,
              badge,
              badgeColor,
              order,
            });
          });
      }
      
      if (fileDocs.length > 0) {
        await DocModel.insertMany(fileDocs);
        docs = await DocModel.find({}).sort({ order: 1 }).lean();
      } else {
        const defaultDoc = {
          slug: "summary",
          title: "Project Summary",
          content: "# Mission Control Documentation\n\nWelcome to the Documentation portal.",
          category: "Overview",
          excerpt: "Project Documentation summary.",
          badge: "Core",
          badgeColor: "text-neon-green",
          order: 0,
        };
        await DocModel.create(defaultDoc);
        docs = [defaultDoc as any];
      }
    }
    
    return docs.map((d: any) => ({
      slug: d.slug,
      title: d.title,
      content: d.content,
      category: d.category,
      excerpt: d.excerpt,
      badge: d.badge,
      badgeColor: d.badgeColor,
    }));
  } catch (error) {
    console.error("Error loading docs from MongoDB:", error);
    return [];
  }
}

export async function getDocBySlug(slug: string): Promise<DocData | null> {
  try {
    await connectDB();
    const doc = await DocModel.findOne({ slug }).lean();
    if (!doc) {
      const all = await getAllDocs();
      const found = all.find((d) => d.slug === slug);
      return found || null;
    }
    return {
      slug: doc.slug,
      title: doc.title,
      content: doc.content,
      category: doc.category,
      excerpt: doc.excerpt,
      badge: doc.badge,
      badgeColor: doc.badgeColor,
    };
  } catch (error) {
    console.error(`Error loading doc ${slug} from MongoDB:`, error);
    return null;
  }
}
