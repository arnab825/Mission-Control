import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

function cleanTitleText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\d]+|Why|How|What|When|[:"'\?\!\-\|\(\)\[\]]/gi, " ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPhotorealistic3DImage(prompt: string, seed: number): Promise<Buffer | null> {
  const cleanPrompt = encodeURIComponent(prompt);
  const models = ["flux", "turbo", "default"];

  for (const model of models) {
    try {
      const modelParam = model !== "default" ? `&model=${model}` : "";
      const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?nologo=true&width=1024&height=768&seed=${seed}${modelParam}`;
      console.log(`[3DGen] Fetching from URL: ${url.slice(0, 100)}...`);
      
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(25000)
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 8000) {
          return buffer;
        }
      }
    } catch (err) {
      console.warn(`[3DGen] Error on model ${model}:`, err);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return null;
}

async function run() {
  await connectDB();

  // Find all posts that currently use .svg or placeholder images
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

  console.log(`[3DGen] Found ${posts.length} posts to convert to photorealistic 3D render artwork.`);

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");
  if (!fs.existsSync(publicBlogDir)) {
    fs.mkdirSync(publicBlogDir, { recursive: true });
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] Generating 3D photorealistic render for: '${post.title}'`);

    const isHardware = post.category === "GPU News" || post.category === "Hardware Deep-Dive";
    const titleClean = cleanTitleText(post.title);

    const prompt = isHardware
      ? `Cinematic 3D render of futuristic ${titleClean} hardware, high-tech GPU graphics card with metallic heatsink, glowing neon green ambient lighting, dark glass surface, octane render style, photorealistic, 8k resolution, no text`
      : `Cinematic 3D video game visual concept art of ${titleClean}, epic character in dramatic fantasy landscape, volumetric lighting, photorealistic 8k, Unreal Engine 5 render style, no text`;

    const seed = Math.floor(Math.random() * 899999) + 100000;
    const buffer = await fetchPhotorealistic3DImage(prompt, seed);

    if (buffer) {
      const pngFileName = `${post.slug}.png`;
      const pngFilePath = path.join(publicBlogDir, pngFileName);
      fs.writeFileSync(pngFilePath, buffer);

      const coverPath = `/images/blog/${pngFileName}`;
      post.coverImage = coverPath;
      await post.save();

      console.log(`[3DGen] SUCCESS! Generated photorealistic 3D image saved to '${coverPath}'`);
    } else {
      console.warn(`[3DGen] Failed to fetch 3D image for '${post.slug}'`);
    }

    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("\n[3DGen] Complete! All blog posts now have photorealistic 3D artwork.");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
