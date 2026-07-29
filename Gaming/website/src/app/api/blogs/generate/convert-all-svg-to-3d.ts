import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

function getClean3DPrompt(title: string, category: string): string {
  const isHardware = category === "GPU News" || category === "Hardware Deep-Dive";

  if (isHardware) {
    const hardwarePrompts = [
      "futuristic nvidia rtx 5090 gpu graphics card, 3d render, neon green, dark reflective glass, 8k, photorealistic",
      "high-tech ai workstation PC with custom water cooling loop, neon green lighting, 3d render, photorealistic, 8k",
      "futuristic gaming laptop with glowing mechanical keyboard and neon accents, 3d render, photorealistic, 8k",
      "microscopic gpu silicon chip processor with glowing neon circuits, 3d render, 8k, photorealistic",
      "nvidia blackwell gpu server rack, glowing green LED cables, 3d render, 8k, photorealistic"
    ];
    return hardwarePrompts[Math.floor(Math.random() * hardwarePrompts.length)];
  } else {
    const gamePrompts = [
      "hands holding futuristic glowing gaming controller, 3d render, cinematic lighting, photorealistic, 8k",
      "epic 3d video game warrior in medieval fantasy castle fortress, volumetric lighting, photorealistic, 8k",
      "futuristic cybernetic game controller on dark desk, neon ambient lighting, 3d render, photorealistic, 8k",
      "epic sci-fi astronaut looking at alien planet landscape, Unreal Engine 5 render, photorealistic, 8k",
      "ancient fantasy ruins with glowing magical runes in misty forest, 3d render, 8k, photorealistic"
    ];
    return gamePrompts[Math.floor(Math.random() * gamePrompts.length)];
  }
}

async function fetch3DPng(prompt: string, seed: number): Promise<Buffer | null> {
  const models = ["flux", "turbo", "default"];
  for (const model of models) {
    try {
      const modelParam = model !== "default" ? `&model=${model}` : "";
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=1024&height=768&seed=${seed}${modelParam}`;
      
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(18000)
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 5000) {
          return buffer;
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  return null;
}

async function run() {
  await connectDB();

  // Find all posts where coverImage points to .svg or is missing
  const posts = await GamingPost.find({
    $or: [
      { coverImage: { $regex: /\.svg$/i } },
      { coverImage: "/images/gpu-placeholder.png" },
      { coverImage: "/images/game-placeholder.png" },
      { coverImage: { $exists: false } },
      { coverImage: null },
      { coverImage: "" }
    ]
  });

  console.log(`[ConvertAll3D] Found ${posts.length} posts with SVG vector artwork to convert to photorealistic 3D PNGs.`);

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] Converting '${post.title}' to 3D photorealistic PNG...`);

    const prompt = getClean3DPrompt(post.title, post.category);
    const seed = Math.floor(Math.random() * 899999) + 100000;
    
    let buffer = await fetch3DPng(prompt, seed);

    if (buffer) {
      const pngFileName = `${post.slug}.png`;
      const pngFilePath = path.join(publicBlogDir, pngFileName);
      fs.writeFileSync(pngFilePath, buffer);

      const coverPath = `/images/blog/${pngFileName}`;
      post.coverImage = coverPath;
      await post.save();

      console.log(`[ConvertAll3D] SUCCESS! '${post.slug}' -> '${coverPath}'`);
    } else {
      console.warn(`[ConvertAll3D] Skipping '${post.slug}' for now.`);
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("[ConvertAll3D] Finished converting all SVG posts to 3D PNGs!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
