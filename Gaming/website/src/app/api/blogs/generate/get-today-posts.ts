import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";

async function run() {
  await connectDB();
  const todayStr = "2026-08-05";
  const regex = new RegExp(`-${todayStr}$`);
  const posts = await GamingPost.find({ slug: { $regex: regex } });
  
  posts.forEach((p, idx) => {
    console.log(`[${idx + 1}] Title: ${p.title}`);
    console.log(`    Category: ${p.category}`);
    console.log(`    Slug: ${p.slug}`);
    console.log(`    Image: ${p.coverImage}\n`);
  });
  process.exit(0);
}

run();
