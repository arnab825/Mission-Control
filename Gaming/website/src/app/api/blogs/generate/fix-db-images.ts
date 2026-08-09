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

    const localImagePath = path.join(publicDir, "images/blog", `${post.slug}.png`);
    const hasLocalImage = fs.existsSync(localImagePath);

    if (hasLocalImage) {
      const expectedCover = `/images/blog/${post.slug}.png`;
      if (newCoverImage !== expectedCover) {
        newCoverImage = expectedCover;
        needsUpdate = true;
      }
    } else if (!newCoverImage || newCoverImage.startsWith("http")) {
      newCoverImage = (post.category === "GPU News" || post.category === "Hardware Deep-Dive")
        ? "/images/gpu-placeholder.png"
        : "/images/game-placeholder.png";
      needsUpdate = true;
    } else if (newCoverImage.startsWith("/images/blog/")) {
      const fullPath = path.join(publicDir, newCoverImage);
      if (!fs.existsSync(fullPath)) {
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
