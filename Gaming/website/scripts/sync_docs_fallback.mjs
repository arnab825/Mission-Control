import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const websiteDir = path.resolve(__dirname, "..");
const docsDirectory = path.join(websiteDir, "docs");
const targetFile = path.join(websiteDir, "src", "lib", "docs-fallback.ts");

const DOCS_ORDER = [
  "summary",
  "changes_summary",
  "architecture_and_fixes",
  "emulation_and_roms",
  "major_changes",
  "distributed_library",
  "design",
  "process",
  "cloudflare_deployment",
  "agentic_logic",
  "agents",
  "controller_mapping",
  "okf",
  "nvidia_ai_guide",
  "nvidia",
  "dlss_guide",
  "on_demand_ai_weights",
  "vision_ai_guide",
  "fps",
  "hardware_optimization",
  "hardwareoptimizationplan",
  "electron_optimization_plan",
  "productroadmap",
  "electronroadmap",
  "aero_ai_full_prompt",
  "patchesfile",
];

const METADATA_FALLBACKS = {
  summary: {
    category: "Overview",
    title: "Project Summary",
    badge: "Core",
    badgeColor: "text-neon-green",
  },
  changes_summary: { category: "Overview", title: "Recent Updates & Major Releases" },
  architecture_and_fixes: {
    category: "Architecture",
    title: "Distributed Architecture & Fixes",
    badge: "Microservices",
    badgeColor: "text-neon-green",
  },
  emulation_and_roms: {
    category: "Architecture",
    title: "Emulation & ROM Library Orchestration",
    badge: "Emulation Hub",
    badgeColor: "text-purple-400",
  },
  major_changes: {
    category: "Architecture",
    title: "Major Upgrades & Infrastructure",
    badge: "Infrastructure",
    badgeColor: "text-neon-green",
  },
  distributed_library: {
    category: "Architecture",
    title: "Distributed Library & Load Balancer",
    badge: "Cluster Engine",
    badgeColor: "text-neon-green",
  },
  design: { category: "Architecture", title: "System Architecture" },
  process: { category: "Architecture", title: "Process & Threading" },
  cloudflare_deployment: {
    category: "Architecture",
    title: "Cloudflare Workers & Subdomain Architecture",
    badge: "Cloudflare",
    badgeColor: "text-amber-400",
  },
  agentic_logic: { category: "Core Logic", title: "Agentic AI Controller" },
  agents: { category: "Core Logic", title: "AI Personalities" },
  controller_mapping: {
    category: "Core Logic",
    title: "Controller & Gamepad Input Mapping",
    badge: "Input Engine",
    badgeColor: "text-neon-green",
  },
  okf: {
    category: "Core Logic",
    title: "Open Knowledge Format (OKF)",
    badge: "Knowledge Engine",
    badgeColor: "text-neon-yellow",
  },
  nvidia_ai_guide: { category: "Integrations", title: "NVIDIA NIM Guide" },
  nvidia: { category: "Integrations", title: "NVIDIA Integration" },
  dlss_guide: { category: "Integrations", title: "Evolution of DLSS" },
  on_demand_ai_weights: {
    category: "AI Models",
    title: "On-Demand AI Model Weights",
    badge: "AI Engine",
    badgeColor: "text-neon-green",
  },
  vision_ai_guide: {
    category: "AI Models",
    title: "Vision On-Demand AI & Perception Models",
    badge: "Vision Engine",
    badgeColor: "text-neon-yellow",
  },
  fps: { category: "Performance", title: "FPS & VRAM Optimization" },
  hardware_optimization: {
    category: "Performance",
    title: "Hardware Optimization & Zero-Overhead",
    badge: "Hardware Engine",
    badgeColor: "text-neon-cyan",
  },
  hardwareoptimizationplan: {
    category: "Performance",
    title: "Hardware Optimization Blueprint",
    badge: "Optimization",
    badgeColor: "text-neon-green",
  },
  electron_optimization_plan: {
    category: "Performance",
    title: "Electron Ultra-Low-Footprint Plan",
    badge: "Zero-Hang",
    badgeColor: "text-neon-cyan",
  },
  patchesfile: { category: "Reference", title: "Patches & Version History" },
  aero_ai_full_prompt: { category: "Reference", title: "Aero AI Prompt" },
  electronroadmap: { category: "Roadmaps", title: "Electron App Roadmap" },
  productroadmap: { category: "Roadmaps", title: "Product Roadmap" },
};

export function syncDocs() {
  if (!fs.existsSync(docsDirectory)) {
    console.error(`[sync-docs] Docs directory not found at ${docsDirectory}`);
    return;
  }

  const fileNames = fs.readdirSync(docsDirectory);
  const fileDocs = [];

  fileNames
    .filter((f) => f.endsWith(".md") || f.endsWith(".mdx"))
    .forEach((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, "").toLowerCase();
      const fullPath = path.join(docsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const matterResult = matter(fileContents);
      const fallback = METADATA_FALLBACKS[slug] || {};

      let title = matterResult.data.title || fallback.title;
      const category = matterResult.data.category || fallback.category || "Documentation";
      let content = matterResult.content;
      let excerpt = matterResult.data.excerpt || "";
      const badge = matterResult.data.badge || fallback.badge || "";
      const badgeColor = matterResult.data.badgeColor || fallback.badgeColor || "";

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
          const isCodeLike =
            /^(```|cpp|python|bash|javascript|cl\s|#include|import\s|PYBIND11|extern\s|\/\/|\/\*)/i.test(
              p
            );
          if (
            p &&
            !p.startsWith("#") &&
            !p.startsWith("-") &&
            !p.startsWith("*") &&
            !isCodeLike
          ) {
            const plain = p
              .replace(/[*_#`\[\]()]/g, "")
              .replace(/\s+/g, " ")
              .trim();
            if (plain.length > 20) {
              excerpt = plain.substring(0, 160);
              if (plain.length > 160) excerpt += "...";
              break;
            }
          }
        }
      }

      fileDocs.push({
        slug,
        title,
        category,
        excerpt,
        badge,
        badgeColor,
        content,
      });
    });

  fileDocs.sort((a, b) => {
    const orderA = DOCS_ORDER.indexOf(a.slug) === -1 ? 999 : DOCS_ORDER.indexOf(a.slug);
    const orderB = DOCS_ORDER.indexOf(b.slug) === -1 ? 999 : DOCS_ORDER.indexOf(b.slug);
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });

  const outputTs = `// Automatically generated by scripts/sync_docs_fallback.js — DO NOT EDIT MANUALLY
export interface FallbackDoc {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  badge?: string;
  badgeColor?: string;
  content: string;
}

export const FALLBACK_DOCS: FallbackDoc[] = ${JSON.stringify(fileDocs, null, 2)};
`;

  fs.writeFileSync(targetFile, outputTs, "utf8");
  console.log(`[SUCCESS] Synced ${fileDocs.length} documentation files into docs-fallback.ts`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  syncDocs();
}
