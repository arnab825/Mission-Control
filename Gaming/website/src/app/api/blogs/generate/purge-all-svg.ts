import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const svgPosts = await GamingPost.find({
    coverImage: { $regex: /\.svg$/i }
  });

  console.log(`[PurgeSVG] Found ${svgPosts.length} posts with .svg cover images.`);

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");
  const publicDir = path.join(process.cwd(), "public");

  for (const post of svgPosts) {
    const isHardware = post.category === "GPU News" || post.category === "Hardware Deep-Dive";
    const srcFallback = isHardware
      ? path.join(publicDir, "images/gpu-placeholder.png")
      : path.join(publicDir, "images/game-placeholder.png");

    const pngFileName = `${post.slug}.png`;
    const pngFilePath = path.join(publicBlogDir, pngFileName);

    fs.copyFileSync(srcFallback, pngFilePath);
    const coverPath = `/images/blog/${pngFileName}`;

    post.coverImage = coverPath;
    await post.save();

    console.log(`[PurgeSVG] Replaced SVG with 3D PNG for: '${post.title}' -> '${coverPath}'`);
  }

  console.log("[PurgeSVG] All SVG cover images purged and converted to 3D PNGs!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
