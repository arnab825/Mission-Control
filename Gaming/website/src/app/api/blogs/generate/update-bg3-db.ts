import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const slug = "game-revisit-baldurs-gate-3-ffxiv-game-development-evolution-2026-07-29";
  const mdxPath = path.join(process.cwd(), "content/blog", `${slug}.mdx`);

  if (!fs.existsSync(mdxPath)) {
    console.error("File not found:", mdxPath);
    process.exit(1);
  }

  let raw = fs.readFileSync(mdxPath, "utf8");
  // Extract body after frontmatter
  const body = raw.replace(/^---[\s\S]*?---\s*/i, "").trim();

  const post = await GamingPost.findOne({ slug });
  if (post) {
    post.markdownBody = body;
    post.content = body;
    await post.save();
    console.log(`[UpdateBG3] Updated MongoDB post '${slug}' with properly fenced code blocks.`);
  }

  // Also audit all other posts in MongoDB and add fences to any unfenced code blocks
  const allPosts = await GamingPost.find({});
  let autoFixed = 0;

  for (const p of allPosts) {
    let content = p.markdownBody || "";
    let original = content;

    // Auto-fence unfenced C# / Python blocks
    content = content.replace(
      /(?:^\/\/\s*Example code[^\n]*\n)?^(public\s+class\s+\w+|import\s+\w+\s*\n\s*def\s+\w+[\s\S]*?)(?=\n\s*\n\s*#|\n\s*\n\s*http|\n\s*\n\s*graph|\n\s*\n\s*class|\n\s*\n\s*##|$(?!\n))/gm,
      (match: string, p1: string) => {
        if (match.includes("```")) return match;
        const lang = p1.includes("import ") || p1.includes("def ") ? "python" : "csharp";
        return `\n\`\`\`${lang}\n${p1.trim()}\n\`\`\`\n`;
      }
    );

    // Auto-fence unfenced Mermaid diagrams
    content = content.replace(
      /(?:^\/\/[^\n]*\n)?^(graph\s+(?:LR|TD|TB|RL)|sequenceDiagram|gantt|classDiagram|flowchart\s+(?:LR|TD|TB|RL))([\s\S]*?)(?=\n\s*\n\s*#|\n\s*\n\s*\/[^\/]|$(?!\n))/gm,
      (match: string, p1: string, p2: string) => {
        if (match.includes("```")) return match;
        return `\n\`\`\`mermaid\n${p1}${p2.trim()}\n\`\`\`\n`;
      }
    );

    if (content !== original) {
      p.markdownBody = content;
      p.content = content;
      await p.save();
      autoFixed++;
    }
  }

  console.log(`[UpdateBG3] Auto-fixed ${autoFixed} posts in MongoDB with proper code fences.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
