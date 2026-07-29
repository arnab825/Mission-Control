import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

async function run() {
  await connectDB();

  const posts = await GamingPost.find({
    $or: [
      { markdownBody: { $regex: /&#123;/ } },
      { content: { $regex: /&#123;/ } }
    ]
  });

  console.log(`[FixKaTeX] Found ${posts.length} posts with HTML entity remnants.`);

  let updatedCount = 0;

  for (const post of posts) {
    let mb = post.markdownBody || "";
    let cnt = post.content || "";

    mb = mb.replace(/&#123;/g, "{").replace(/&#125;/g, "}");
    cnt = cnt.replace(/&#123;/g, "{").replace(/&#125;/g, "}");

    post.markdownBody = mb;
    post.content = cnt;
    await post.save();

    // Also fix local MDX file if exists
    const mdxPath = path.join(process.cwd(), "content/blog", `${post.slug}.mdx`);
    if (fs.existsSync(mdxPath)) {
      let raw = fs.readFileSync(mdxPath, "utf8");
      raw = raw.replace(/&#123;/g, "{").replace(/&#125;/g, "}");
      fs.writeFileSync(mdxPath, raw, "utf8");
    }

    updatedCount++;
    console.log(`[FixKaTeX] Cleaned entities for: '${post.slug}'`);
  }

  console.log(`[FixKaTeX] Completed! Restored KaTeX formatting for ${updatedCount} posts.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
