import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { generateBlogCoverImage } from "./shared";

async function run() {
  await connectDB();

  // Query all posts published today (2026-08-11)
  const startOfDay = new Date("2026-08-11T00:00:00.000Z");
  const endOfDay = new Date("2026-08-11T23:59:59.999Z");
  const posts = await GamingPost.find({
    publishedAt: { $gte: startOfDay, $lte: endOfDay }
  });

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
