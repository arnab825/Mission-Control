import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";
import { POST } from "./route";

async function run() {
  await connectDB();

  const targetDates = ["2026-07-21", "2026-07-22"];
  console.log(`[DeleteRegen] Targeted dates for deletion:`, targetDates);

  // 1. Delete from MongoDB
  for (const date of targetDates) {
    const regex = new RegExp(`-${date}$`);
    const deleteResult = await GamingPost.deleteMany({ slug: { $regex: regex } });
    console.log(`[DeleteRegen] Deleted ${deleteResult.deletedCount} posts from MongoDB for date: ${date}`);
  }

  // 2. Delete local MDX files
  const contentDir = path.join(process.cwd(), "content/blog");
  if (fs.existsSync(contentDir)) {
    const files = fs.readdirSync(contentDir);
    for (const file of files) {
      if (file.endsWith(".mdx")) {
        const matchesDate = targetDates.some((date) => file.endsWith(`-${date}.mdx`));
        if (matchesDate) {
          const filePath = path.join(contentDir, file);
          fs.unlinkSync(filePath);
          console.log(`[DeleteRegen] Deleted local MDX file: ${file}`);
        }
      }
    }
  }

  // 3. Delete from generate.log if needed or append notice
  const logFile = path.join(process.cwd(), "generate.log");
  fs.appendFileSync(logFile, `[DeleteRegen] Cleaned database and local files for July 21st and 22nd. Regenerating...\n`);

  // 4. Regenerate posts for July 21st and 22nd
  for (const date of targetDates) {
    console.log(`\n==================================================`);
    console.log(`[DeleteRegen] Regenerating blog posts for date: ${date}`);
    console.log(`==================================================`);
    
    const mockRequest = {
      url: `http://localhost/api/blogs/generate?date=${date}`,
      headers: {
        get: (name: string) => null
      }
    } as any;

    try {
      const response = await POST(mockRequest);
      const data = await response.json();
      console.log(`[DeleteRegen] Success for ${date}:`, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`[DeleteRegen] Failed for ${date}:`, err);
    }
  }

  console.log(`\n[DeleteRegen] Deletion and regeneration complete!`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
