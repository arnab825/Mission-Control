import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function fetch3DImage(prompt: string, seed: number): Promise<Buffer | null> {
  const cleanPrompt = encodeURIComponent(prompt);
  const models = ["flux", "turbo", "default"];

  for (const model of models) {
    try {
      const modelParam = model !== "default" ? `&model=${model}` : "";
      const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?nologo=true&width=1024&height=768&seed=${seed}${modelParam}`;
      console.log(`[Top3D] Fetching ${model} with prompt: '${prompt}'`);
      
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(25000)
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 5000) {
          return buffer;
        }
      }
    } catch (err) {
      console.warn(`[Top3D] ${model} attempt failed:`, err);
      await new Promise((r) => setTimeout(r, 800));
    }
  }
  return null;
}

async function run() {
  await connectDB();

  const targets = [
    {
      slug: "gpu-news-nvidia-rtx-spark-prototype-laptop-ai-singularity-technical-deep-dive-2026-07-29",
      prompt: "futuristic nvidia rtx gaming laptop, 3d render, neon green lighting, dark glass desk, photorealistic, 8k, no text"
    },
    {
      slug: "hardware-deep-dive-nvidia-rtx-5090-blackwell-architecture-amd-rdna4-gpu-strategy-2026-07-29",
      prompt: "nvidia rtx 5090 gpu graphics card, 3d render, metallic heatsink, green neon glow, 8k, photorealistic, no text"
    },
    {
      slug: "game-news-gaming-industry-updates-mid-2026-2026-07-29",
      prompt: "epic 3d video game warrior in medieval castle fortress, volumetric lighting, photorealistic, 8k, no text"
    }
  ];

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");

  for (const item of targets) {
    const post = await GamingPost.findOne({ slug: item.slug });
    if (!post) continue;

    console.log(`\n[Top3D] Generating photorealistic 3D render for: '${post.title}'`);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    const buffer = await fetch3DImage(item.prompt, seed);

    if (buffer) {
      const pngFileName = `${post.slug}.png`;
      const pngFilePath = path.join(publicBlogDir, pngFileName);
      fs.writeFileSync(pngFilePath, buffer);

      const coverPath = `/images/blog/${pngFileName}`;
      post.coverImage = coverPath;
      await post.save();
      console.log(`[Top3D] SUCCESS! Updated '${post.slug}' -> '${coverPath}'`);
    } else {
      console.warn(`[Top3D] Failed to fetch image for '${post.slug}'`);
    }
  }

  console.log("\n[Top3D] Complete! All hero posts updated with 3D photorealistic images.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
