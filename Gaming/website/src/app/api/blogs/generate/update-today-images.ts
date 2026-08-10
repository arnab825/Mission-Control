import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { generateBlogCoverImage } from "./shared";

async function run() {
  await connectDB();

  const targetSlugs = [
    "game-news-handheld-cloud-breaches-eos-workarounds-gaming-tech-2026-2026-08-10",
    "hardware-deep-dive-architectural-divergence-nvidia-blackwell-512-bit-amd-rdna4-2026-08-10",
    "game-revisit-gba-engine-architecture-tilemaps-dma-2026-08-10",
    "gpu-news-nvidia-blackwell-rtx-5090-amd-rdna4-market-shift-2026-08-10"
  ];

  const posts = await GamingPost.find({ slug: { $in: targetSlugs } });

  console.log(`[UpdateTodayImages] Found ${posts.length} posts for today.`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] Generating fresh AI cover image for: '${post.title}' (${post.category})`);

    const isHardware = post.category === "GPU News" || post.category === "Hardware Deep-Dive";
    const cleanTitle = post.title.replace(/[\u0300-\u036f]/g, "").replace(/[:"'\?\!\-\|\(\)\[\]]/g, " ").trim();

    const prompt = isHardware
      ? `photorealistic 3d render of ${cleanTitle.slice(0, 120)}, high tech computer hardware architecture, glowing neon green metallic heatsink, 8k, no text`
      : `cinematic 3d video game visual concept art of ${cleanTitle.slice(0, 120)}, epic action scene, volumetric lighting, photorealistic 8k, no text`;

    const coverPath = await generateBlogCoverImage(
      prompt,
      post.title,
      post.category,
      post.slug,
      process.env.HF_TOKEN
    );

    post.coverImage = coverPath;
    await post.save();
    console.log(`[UpdateTodayImages] Updated post '${post.title}' -> '${coverPath}'`);
  }

  console.log("\n[UpdateTodayImages] All today's post images successfully updated!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
