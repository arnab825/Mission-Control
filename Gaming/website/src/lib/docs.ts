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
  "distributed_library",
  "design",
  "process",
  "agentic_logic",
  "agents",
  "controller_mapping",
  "nvidia_ai_guide",
  "nvidia",
  "dlss_guide",
  "on_demand_ai_weights",
  "vision_ai_guide",
  "fps",
  "productroadmap",
  "electronroadmap",
  "aero_ai_full_prompt",
  "patchesfile"
];

const METADATA_FALLBACKS: Record<string, { category?: string; title?: string; badge?: string; badgeColor?: string }> = {
  "summary": { category: "Overview", title: "Project Summary", badge: "Core", badgeColor: "text-neon-green" },
  "changes_summary": { category: "Overview", title: "Recent Updates" },
  "distributed_library": { category: "Architecture", title: "Distributed Library & Load Balancer", badge: "Cluster Engine", badgeColor: "text-neon-green" },
  "design": { category: "Architecture", title: "System Architecture" },
  "process": { category: "Architecture", title: "Process & Threading" },
  "agentic_logic": { category: "Core Logic", title: "Agentic AI Controller" },
  "agents": { category: "Core Logic", title: "AI Personalities" },
  "controller_mapping": { category: "Core Logic", title: "Controller & Gamepad Input Mapping", badge: "Input Engine", badgeColor: "text-neon-green" },
  "nvidia_ai_guide": { category: "Integrations", title: "NVIDIA NIM Guide" },
  "nvidia": { category: "Integrations", title: "NVIDIA Integration" },
  "dlss_guide": { category: "Integrations", title: "Evolution of DLSS" },
  "on_demand_ai_weights": { category: "AI Models", title: "On-Demand AI Model Weights", badge: "AI Engine", badgeColor: "text-neon-green" },
  "vision_ai_guide": { category: "AI Models", title: "Vision On-Demand AI & Perception Models", badge: "Vision Engine", badgeColor: "text-neon-yellow" },
  "fps": { category: "Performance", title: "FPS & VRAM Optimization" },
  "patchesfile": { category: "Reference", title: "Patches & Version History" },
  "aero_ai_full_prompt": { category: "Reference", title: "Aero AI Prompt" },
  "electronroadmap": { category: "Roadmaps", title: "Electron App Roadmap" },
  "productroadmap": { category: "Roadmaps", title: "Product Roadmap" },
};


let cachedDocs: DocData[] | null = null;

export async function getAllDocs(): Promise<DocData[]> {
  if (cachedDocs && process.env.NODE_ENV === "production") {
    return cachedDocs;
  }

  try {
    // 1. If local docs directory exists, read directly without blocking on MongoDB sync
    if (fs.existsSync(docsDirectory)) {
      const fileNames = fs.readdirSync(docsDirectory);
      const fileDocs: DocData[] = [];

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
              const isCodeLike = /^(```|cpp|python|bash|javascript|cl\s|#include|import\s|PYBIND11|extern\s|\/\/|\/\*)/i.test(p);
              if (p && !p.startsWith("#") && !p.startsWith("-") && !p.startsWith("*") && !isCodeLike) {
                const plain = p.replace(/[*_#`\[\]()]/g, "").replace(/\s+/g, " ").trim();
                if (plain.length > 20) {
                  excerpt = plain.substring(0, 160);
                  if (plain.length > 160) excerpt += "...";
                  break;
                }
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
          });
        });

      if (fileDocs.length > 0) {
        cachedDocs = fileDocs;
        return fileDocs;
      }
    }

    // 2. Fallback to MongoDB query if no local files found
    await connectDB();
    let docs = await DocModel.find({}).sort({ order: 1 }).lean();

    const result = docs.map((d: any) => ({
      slug: d.slug,
      title: d.title,
      content: d.content,
      category: d.category,
      excerpt: d.excerpt,
      badge: d.badge,
      badgeColor: d.badgeColor,
    }));

    cachedDocs = result;
    return result;
  } catch (error) {
    console.error("Error loading docs:", error);
    return [];
  }
}

export async function getDocBySlug(slug: string): Promise<DocData | null> {
  try {
    const all = await getAllDocs();
    const found = all.find((d) => d.slug.toLowerCase() === slug.toLowerCase());
    return found || null;
  } catch (error) {
    console.error(`Error loading doc ${slug} from MongoDB:`, error);
    return null;
  }
}
