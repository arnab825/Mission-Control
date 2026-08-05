import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import path from "path";
import { generateBlogCoverImage } from "./shared";

async function run() {
  await connectDB();

  const posts = await GamingPost.find({
    $or: [
      { coverImage: "/images/gpu-placeholder.png" },
      { coverImage: "/images/game-placeholder.png" },
      { coverImage: { $regex: /\.svg$/ } },
      { coverImage: { $exists: false } },
      { coverImage: null },
      { coverImage: "" }
    ]
  });

  console.log(`[GenMissingImages] Found ${posts.length} blog posts needing custom AI cover images.`);

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] Generating unique cover art for: '${post.title}'`);

    const isHardware = post.category === "GPU News" || post.category === "Hardware Deep-Dive";
    const cleanTitle = post.title.replace(/[\u0300-\u036f]/g, "").replace(/[:"'\?\!\-\|\(\)\[\]]/g, " ").trim();
    
    const prompt = isHardware
      ? `photorealistic 3d render of ${cleanTitle.slice(0, 100)}, high tech computer hardware architecture, glowing neon green metallic heatsink, 8k, no text`
      : `cinematic 3d video game visual concept art of ${cleanTitle.slice(0, 100)}, epic action scene, volumetric lighting, photorealistic 8k, no text`;

    const coverPath = await generateBlogCoverImage(
      prompt,
      post.title,
      post.category,
      post.slug,
      process.env.HF_TOKEN
    );

    post.coverImage = coverPath;
    await post.save();
    console.log(`[GenMissingImages] Updated post '${post.title}' -> '${coverPath}'`);
  }

  console.log("\n[GenMissingImages] All missing custom images processed!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

