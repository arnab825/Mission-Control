import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

function cleanPromptText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents (e.g. Pokémon -> Pokemon, Tōkon -> Tokon)
    .replace(/[\d]+|Why|How|What|When|[:"'\?\!\-\|\(\)\[\]]/gi, " ")
    .replace(/[^\x00-\x7F]/g, "") // Strip non-ASCII
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPollinationsImage(prompt: string, seed: number): Promise<Buffer | null> {
  const cleaned = cleanPromptText(prompt);
  const models = ["flux", "turbo", "default"];

  for (const model of models) {
    try {
      const modelParam = model !== "default" ? `&model=${model}` : "";
      const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleaned.slice(0, 200))}?nologo=true&width=1024&height=768&seed=${seed}${modelParam}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length > 5000) {
          return buffer;
        }
      }
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  return null;
}

async function run() {
  await connectDB();

  const posts = await GamingPost.find({
    $or: [
      { coverImage: "/images/gpu-placeholder.png" },
      { coverImage: "/images/game-placeholder.png" },
      { coverImage: { $exists: false } },
      { coverImage: null },
      { coverImage: "" }
    ]
  });

  console.log(`[GenMissingImages] Found ${posts.length} blog posts needing custom AI cover images.`);

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");
  if (!fs.existsSync(publicBlogDir)) {
    fs.mkdirSync(publicBlogDir, { recursive: true });
  }

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] Generating unique cover art for: '${post.title}'`);

    const isHardware = post.category === "GPU News" || post.category === "Hardware Deep-Dive";
    const cleanTitle = cleanPromptText(post.title);
    
    const prompt = isHardware
      ? `High-tech computer hardware engineering render of ${cleanTitle}, microscopic GPU circuit board architecture, glowing neon green metallic heatsink, 8k resolution, cinematic lighting, no text`
      : `Cinematic 3D video game visual concept art of ${cleanTitle}, epic action scene, dramatic volumetric lighting, 8k resolution, Unreal Engine render, no text`;

    const seed = Math.floor(Math.random() * 999999) + 1000;
    let buffer = await fetchPollinationsImage(prompt, seed);

    if (!buffer) {
      // Retry with simplified prompt
      const simplePrompt = isHardware
        ? `NVIDIA RTX graphics card cyber GPU hardware with neon green ambient lighting, 8k render`
        : `Futuristic 3D gaming controller concept art with glowing neon accents, 8k render`;
      buffer = await fetchPollinationsImage(simplePrompt, seed + 1);
    }

    if (buffer) {
      const imageFileName = `${post.slug}.png`;
      const localFilePath = path.join(publicBlogDir, imageFileName);
      fs.writeFileSync(localFilePath, buffer);

      const coverPath = `/images/blog/${imageFileName}`;
      post.coverImage = coverPath;
      await post.save();

      console.log(`[GenMissingImages] SUCCESS! Saved custom image to '${coverPath}'`);
    } else {
      console.warn(`[GenMissingImages] Skipping '${post.slug}' for now.`);
    }

    await new Promise((r) => setTimeout(r, 800));
  }

  console.log("\n[GenMissingImages] All missing custom images processed!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
