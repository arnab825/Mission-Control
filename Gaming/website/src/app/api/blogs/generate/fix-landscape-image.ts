import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const slug = "game-news-gaming-landscape-evolves-trends-insights-2026-07-27";
  const post = await GamingPost.findOne({ slug });

  if (!post) {
    console.error("Post not found:", slug);
    process.exit(1);
  }

  console.log(`[FixLandscape] Fetching photorealistic 3D render for '${post.title}'...`);

  const prompt = "hands holding futuristic glowing gaming controller, 3d render, cinematic lighting, photorealistic, 8k";
  const models = ["flux", "turbo", "default"];
  const publicBlogDir = path.join(process.cwd(), "public/images/blog");

  for (let attempt = 0; attempt < 5; attempt++) {
    for (const model of models) {
      try {
        const seed = Math.floor(Math.random() * 999999) + 1;
        const modelParam = model !== "default" ? `&model=${model}` : "";
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=1024&height=768&seed=${seed}${modelParam}`;
        
        console.log(`[FixLandscape] Trying model ${model} (attempt ${attempt + 1})...`);
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(20000)
        });

        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          if (buffer.length > 5000) {
            const pngFileName = `${slug}.png`;
            const pngFilePath = path.join(publicBlogDir, pngFileName);
            fs.writeFileSync(pngFilePath, buffer);

            const coverPath = `/images/blog/${pngFileName}`;
            post.coverImage = coverPath;
            await post.save();

            console.log(`[FixLandscape] SUCCESS! Generated 3D image saved to '${coverPath}'`);
            process.exit(0);
          }
        }
      } catch (err) {
        await new Promise((r) => setTimeout(r, 600));
      }
    }
  }

  console.error("[FixLandscape] Failed across all attempts.");
  process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
