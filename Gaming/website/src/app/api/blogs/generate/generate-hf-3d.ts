import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function fetchHFImage(prompt: string): Promise<Buffer | null> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    console.warn("[HFGen] HF_TOKEN is not set in environment.");
    return null;
  }
  const models = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5"
  ];

  for (const model of models) {
    try {
      console.log(`[HFGen] Fetching from HuggingFace model '${model}'...`);
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputs: prompt }),
        signal: AbortSignal.timeout(25000)
      });

      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 5000) {
          return buffer;
        }
      } else {
        const errText = await res.text();
        console.warn(`[HFGen] Model ${model} returned ${res.status}:`, errText.slice(0, 150));
      }
    } catch (err) {
      console.warn(`[HFGen] Model ${model} error:`, err);
    }
  }
  return null;
}

async function run() {
  await connectDB();

  const slug = "game-news-gaming-landscape-evolves-trends-insights-2026-07-27";
  const post = await GamingPost.findOne({ slug });

  if (!post) {
    console.error("Post not found:", slug);
    process.exit(1);
  }

  console.log(`[HFGen] Generating photorealistic 3D render for: '${post.title}'`);
  const prompt = "hands holding glowing futuristic gaming controller, 3d render, cinematic lighting, photorealistic, 8k resolution, Unreal Engine 5 render style";

  const buffer = await fetchHFImage(prompt);
  const publicBlogDir = path.join(process.cwd(), "public/images/blog");

  if (buffer) {
    const pngFileName = `${slug}.png`;
    const pngFilePath = path.join(publicBlogDir, pngFileName);
    fs.writeFileSync(pngFilePath, buffer);

    const coverPath = `/images/blog/${pngFileName}`;
    post.coverImage = coverPath;
    await post.save();

    console.log(`[HFGen] SUCCESS! Generated photorealistic 3D image saved to '${coverPath}'`);
  } else {
    // If external APIs are rate limited, copy a photorealistic 3D image from public/images/game-placeholder.png or benchmarks
    const fallbackSource = path.join(process.cwd(), "public/images/game-placeholder.png");
    const pngFileName = `${slug}.png`;
    const pngFilePath = path.join(publicBlogDir, pngFileName);
    fs.copyFileSync(fallbackSource, pngFilePath);

    const coverPath = `/images/blog/${pngFileName}`;
    post.coverImage = coverPath;
    await post.save();
    console.log(`[HFGen] Saved high-res 3D game artwork fallback to '${coverPath}'`);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
