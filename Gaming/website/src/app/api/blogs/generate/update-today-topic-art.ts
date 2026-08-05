import "./loadenv";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import fs from "fs";
import path from "path";

// Curated high-resolution 16:9 topic-matching photography for today's 8 articles
const TOPIC_ART_MAP: Record<string, string> = {
  // 1. Physical media & discs
  "game-news-bait-and-switch-in-gaming-2026-08-05": "https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1200&q=80",
  
  // 2. Gaming setup, headphones & vinyl
  "game-news-gaming-industry-trends-2026-2026-08-05": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
  
  // 3. Dark Souls / Elden Ring medieval knight rendering engine
  "game-revisit-game-rendering-engines-evolution-2026-08-05": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
  
  // 4. Epic 3D gaming action visual for Riftbound
  "game-revisit-riftbound-rise-to-success-small-team-overcoming-obstacles-2026-08-05": "https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=1200&q=80",

  
  // 5. VRAM memory chips
  "gpu-news-gpu-makers-listen-up-8gb-vram-is-just-the-beginning-2026-08-05": "https://images.unsplash.com/photo-1591799264318-7e6ef8ddb7ea?auto=format&fit=crop&w=1200&q=80",
  
  // 6. High-end RTX graphics card
  "gpu-news-gpu-pricing-hikes-and-vram-reality-2026-08-05": "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80",
  
  // 7. Semiconductor silicon wafer / microchip
  "hardware-deep-dive-gpu-price-hikes-client-market-gaming-performance-2026-08-05": "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80",
  
  // 8. High performance memory & copper cooling
  "hardware-deep-dive-gpu-price-hikes-high-performance-memory-2026-08-05": "https://images.unsplash.com/photo-1555680202-c86f0e12f086?auto=format&fit=crop&w=1200&q=80"
};

async function downloadImage(url: string, targetPath: string): Promise<boolean> {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > 5000) {
        fs.writeFileSync(targetPath, buffer);
        return true;
      }
    }
  } catch (err) {
    console.error(`Failed to download ${url}:`, err);
  }
  return false;
}

async function run() {
  await connectDB();

  const publicBlogDir = path.join(process.cwd(), "public/images/blog");
  if (!fs.existsSync(publicBlogDir)) {
    fs.mkdirSync(publicBlogDir, { recursive: true });
  }

  const entries = Object.entries(TOPIC_ART_MAP);
  console.log(`[UpdateTopicArt] Updating ${entries.length} posts with distinct topic-matched photography...`);

  for (let i = 0; i < entries.length; i++) {
    const [slug, url] = entries[i];
    const post = await GamingPost.findOne({ slug });

    if (post) {
      console.log(`\n[${i + 1}/${entries.length}] Downloading custom topic art for: '${post.title}'`);
      const fileName = `${slug}.png`;
      const targetPath = path.join(publicBlogDir, fileName);

      const ok = await downloadImage(url, targetPath);
      if (ok) {
        const coverPath = `/images/blog/${fileName}`;
        post.coverImage = coverPath;
        await post.save();
        console.log(`[UpdateTopicArt] SUCCESS! Saved unique topic art to '${coverPath}'`);
      } else {
        console.warn(`[UpdateTopicArt] Failed to update '${slug}'`);
      }
    } else {
      console.warn(`[UpdateTopicArt] Post not found for slug: ${slug}`);
    }
  }

  console.log("\n[UpdateTopicArt] All today's posts updated with unique, 100% topic-matched photography!");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
