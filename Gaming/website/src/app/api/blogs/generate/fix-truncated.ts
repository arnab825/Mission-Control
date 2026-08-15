import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { POST } from "./route";

async function run() {
  await connectDB();

  console.log("[FixTruncated] Scanning MongoDB for cut-off / incomplete posts...");
  const posts = await GamingPost.find().lean();
  let fixCount = 0;

  for (const post of posts) {
    const body = (post.markdownBody || "").trim();
    // Check if post body ends mid-sentence (without period, exclamation, question mark, or code fence)
    if (body && !/[.!?\`"'\n]$/.test(body)) {
      console.log(`[FixTruncated] Found truncated post: "${post.title}" (${post.slug})`);
      
      // Trim incomplete sentence at last period/exclamation/question mark
      const lastPunct = Math.max(
        body.lastIndexOf("."),
        body.lastIndexOf("!"),
        body.lastIndexOf("?"),
        body.lastIndexOf("```")
      );

      if (lastPunct > 100) {
        const endOffset = body.substring(lastPunct, lastPunct + 3) === "```" ? 3 : 1;
        const cleanedBody = body.slice(0, lastPunct + endOffset).trim();
        
        await GamingPost.updateOne(
          { _id: post._id },
          { $set: { markdownBody: cleanedBody } }
        );
        console.log(`[FixTruncated] Cleaned & saved updated post body for: ${post.slug}`);
        fixCount++;
      }
    }
  }

  console.log(`[FixTruncated] Completed scanning. Fixed ${fixCount} truncated posts.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
