import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const posts = await GamingPost.find({});
  console.log(`[FixDBImages] Checking ${posts.length} blog posts in MongoDB...`);

  const publicDir = path.join(process.cwd(), "public");
  let fixedCount = 0;

  for (const post of posts) {
    let needsUpdate = false;
    let newCoverImage = post.coverImage;

    // Check if coverImage is missing, points to external URL, or missing local file
    if (!newCoverImage) {
      needsUpdate = true;
    } else if (newCoverImage.startsWith("http")) {
      // Check if a local image exists for this slug
      const localImagePath = path.join(publicDir, "images/blog", `${post.slug}.png`);
      if (fs.existsSync(localImagePath)) {
        newCoverImage = `/images/blog/${post.slug}.png`;
        needsUpdate = true;
      } else {
        newCoverImage = (post.category === "GPU News" || post.category === "Hardware Deep-Dive")
          ? "/images/gpu-placeholder.png"
          : "/images/game-placeholder.png";
        needsUpdate = true;
      }
    } else if (newCoverImage.startsWith("/images/blog/")) {
      const fullPath = path.join(publicDir, newCoverImage);
      if (!fs.existsSync(fullPath)) {
        // Fallback to placeholder if local file is missing
        newCoverImage = (post.category === "GPU News" || post.category === "Hardware Deep-Dive")
          ? "/images/gpu-placeholder.png"
          : "/images/game-placeholder.png";
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      post.coverImage = newCoverImage;
      await post.save();
      fixedCount++;
      console.log(`[FixDBImages] Fixed coverImage for '${post.slug}' -> '${newCoverImage}'`);
    }
  }

  console.log(`\n[FixDBImages] Completed! Fixed ${fixedCount} posts in MongoDB.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("[FixDBImages] Error:", err);
  process.exit(1);
});
