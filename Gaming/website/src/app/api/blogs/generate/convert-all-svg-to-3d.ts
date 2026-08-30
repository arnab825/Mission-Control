import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function getClean3DPrompt(title: string, category: string): Promise<string> {
  const isHardware = category === "GPU News" || category === "Hardware Deep-Dive";
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (geminiKey) {
    const instructions = isHardware
      ? `You are an AI art director. Convert this article topic into a 15-20 word physical description of a photorealistic 3D render of computer hardware, GPU, processor, or silicon architecture.
RULES:
1. STRICTLY NO abstract concepts or words like "analysis", "breakdown", "news", "article", "review", "benchmark", "performance", "leaks".
2. Describe ONLY physical objects: glowing neon green circuits, dark tempered glass, GPU cooling fans, metallic heatsinks, copper heat pipes, cinematic studio lighting, 8k resolution, photorealistic 3d render.
3. Return ONLY the image prompt text.`
      : `You are an AI art director. Convert this gaming article topic into a 15-20 word physical description of a photorealistic 3D video game scene.
RULES:
1. STRICTLY NO abstract concepts or words like "analysis", "breakdown", "news", "article", "review", "leaks", "AI-rife", "gameplay", "remake".
2. Describe ONLY tangible visual elements: concrete game characters, muscle cars on neon-lit city streets, ancient temple ruins, futuristic cyberpunk armor, cinematic volumetric lighting, Unreal Engine 5 render, 8k resolution, photorealistic.
3. Return ONLY the image prompt text.`;

    const models = ["gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-flash-lite-latest", "gemini-flash-latest"];
    for (const model of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${instructions}\n\nArticle Topic: "${title}"` }] }],
            generationConfig: { maxOutputTokens: 120, temperature: 0.4 }
          }),
          signal: AbortSignal.timeout(8000)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text && text.length > 10) {
            return text;
          }
        }
      } catch {}
    }
  }

  const cleanBase = title
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Why|How|What|When|[:"'\?\!\-\|\(\)\[\]]/gi, " ")
    .replace(/breakdown|analysis|news|leaks|updates|industry|frontier|gameplay/gi, " ")
    .replace(/[^\x00-\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);

  return isHardware
    ? `futuristic computer hardware 3d render of ${cleanBase}, glowing neon green accents, dark glass, 8k photorealistic`
    : `cinematic 3d video game concept art of ${cleanBase}, dramatic volumetric lighting, unreal engine 5, 8k photorealistic`;
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

    const prompt = await getClean3DPrompt(post.title, post.category);
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
