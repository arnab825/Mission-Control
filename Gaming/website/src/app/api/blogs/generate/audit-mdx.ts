import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";

async function run() {
  await connectDB();

  const posts = await GamingPost.find({});
  console.log(`[AuditMDX] Auditing ${posts.length} posts for frontmatter or malformed MDX...`);

  let fixedCount = 0;

  for (const post of posts) {
    let content = post.markdownBody || post.content || "";
    let original = content;

    // Remove frontmatter if stored inside markdownBody
    if (content.trim().startsWith("---")) {
      content = content.replace(/^---[\s\S]*?---\s*/i, "").trim();
    }

    // Remove raw ```md wrapper
    if (content.startsWith("```md") || content.startsWith("```markdown")) {
      content = content.replace(/^```(?:markdown|md)\r?\n([\s\S]*?)\r?\n```$/gi, "$1").trim();
    }

    if (content !== original) {
      post.markdownBody = content;
      post.content = content;
      await post.save();
      fixedCount++;
      console.log(`[AuditMDX] Cleaned markdownBody for: '${post.slug}'`);
    }
  }

  console.log(`[AuditMDX] Complete! Cleaned ${fixedCount} posts.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
