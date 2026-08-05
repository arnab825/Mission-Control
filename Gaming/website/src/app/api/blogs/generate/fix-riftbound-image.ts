import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const slug = "game-revisit-riftbound-rise-to-success-small-team-overcoming-obstacles-2026-08-05";
  const post = await GamingPost.findOne({ slug });

  if (!post) {
    console.error("Post not found for slug:", slug);
    process.exit(1);
  }

  // High-res epic 3D gaming action visual
  const imageUrl = "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80";

  console.log(`Downloading fresh epic gaming artwork for: '${post.title}'`);
  const res = await fetch(imageUrl);

  if (res.ok) {
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > 5000) {
      const publicBlogDir = path.join(process.cwd(), "public/images/blog");
      const fileName = `${slug}.png`;
      const targetPath = path.join(publicBlogDir, fileName);

      fs.writeFileSync(targetPath, buffer);
      
      const coverPath = `/images/blog/${fileName}`;
      post.coverImage = coverPath;
      await post.save();

      console.log(`SUCCESS! Updated Riftbound cover image to '${coverPath}' (${buffer.length} bytes)`);
    } else {
      console.error("Downloaded image too small:", buffer.length);
    }
  } else {
    console.error("Failed to fetch image, status:", res.status);
  }

  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
