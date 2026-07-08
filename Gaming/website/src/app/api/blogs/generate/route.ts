import { NextRequest, NextResponse } from "next/server";
import { sanityWriteClient } from "@/lib/sanity";
import { InferenceClient } from "@huggingface/inference";
import fs from "fs";
import path from "path";

const GAMING_RSS_FEEDS = [
  { url: "http://feeds.ign.com/ign/all", label: "IGN", type: "gaming" },
  { url: "https://kotaku.com/rss", label: "Kotaku", type: "gaming" },
  { url: "https://www.eurogamer.net/?format=rss", label: "Eurogamer", type: "gaming" },
  { url: "https://feeds.anandtech.com/anandtech/anandtech.xml", label: "AnandTech", type: "hardware" },
  { url: "https://www.tomshardware.com/feeds/all", label: "Tom's Hardware", type: "hardware" },
];

interface FeedItem {
  title: string;
  link: string;
  description: string;
  source: string;
}

async function fetchRSSFeed(feedUrl: string, label: string): Promise<FeedItem[]> {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];
    const xml = await response.text();

    const items: FeedItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
      const block = match[1];
      const title =
        (/<title><!\[CDATA\[(.*?)\]\]><\/title>/.exec(block) ||
          /<title>(.*?)<\/title>/.exec(block))?.[1]?.trim() ?? "";
      const link =
        (/<link>(.*?)<\/link>/.exec(block) ||
          /<link href="(.*?)"/.exec(block))?.[1]?.trim() ?? "";
      const desc =
        (/<description><!\[CDATA\[(.*?)\]\]><\/description>/.exec(block) ||
          /<description>(.*?)<\/description>/.exec(block))?.[1]
          ?.replace(/<[^>]*>/g, "")
          ?.trim()
          ?.slice(0, 400) ?? "";

      if (title) items.push({ title, link, description: desc, source: label });
    }
    return items;
  } catch {
    return [];
  }
}

function sanitizeMermaid(content: string): string {
  if (!content) return content;
  return content.replace(/```mermaid([\s\S]*?)```/g, (match, mermaidCode) => {
    let code = mermaidCode;
    
    // 1. Fix flowchart arrows ending with |text|>
    code = code.replace(/-->\s*\|([^|]+)\|\s*>/g, "-->|$1| ");
    code = code.replace(/-->\s*\|([^|]+)\|>/g, "-->|$1| ");
    
    // 2. Fix pie chart titles (remove colon)
    code = code.replace(/^\s*title:\s*(.*)$/gm, "    title $1");
    
    // 3. Fix sequence diagram notes without placement (e.g. note "text")
    if (code.includes("sequenceDiagram")) {
      const actorRegex = /participant\s+(\w+)/g;
      const actors: string[] = [];
      let actorMatch;
      while ((actorMatch = actorRegex.exec(code)) !== null) {
        actors.push(actorMatch[1]);
      }
      
      const defaultActor = actors[0] || "System";
      const targetNoteActor = actors.length >= 2 ? `${actors[0]}, ${actors[1]}` : defaultActor;
      
      code = code.replace(/^\s*note\s+["']([^"']+)["']/gm, `    Note over ${targetNoteActor}: $1`);
      code = code.replace(/^\s*Note\s+["']([^"']+)["']/gm, `    Note over ${targetNoteActor}: $1`);
    }
    
    return "```mermaid" + code + "```";
  });
}

async function generateBlogPost(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  apiKey: string
): Promise<{ slug: string; title: string; excerpt: string; tags: string[]; content: string } | null> {
  const today = new Date().toISOString().split("T")[0];
  const headlines = items
    .slice(0, 8)
    .map((i, idx) => `${idx + 1}. [${i.source}] ${i.title}\n   ${i.description}`)
    .join("\n\n");

  const prompt = `You are a technical gaming journalist writing for a high-quality developer and gamer audience.

Today is ${today}. Based on the following real headlines and news items, write a comprehensive blog post.

HEADLINES:
${headlines}

REQUIREMENTS & STANDARDS:
- Post type: ${postType}
- Tone: Sharp, technical, authoritative. Write as an experienced technology journalist, engineer, or game analyst—not as a generic AI. Avoid repetitive AI clichés and generic introductions. Blend technical depth with readability.
- Length: 700-900 words. Start with a compelling introduction paragraph and include a brief ## Conclusion section.

1. MARKDOWN FORMATTING:
- Use proper heading hierarchy (#, ##, ###, ####). Include 3-4 structured sections with ## headers.
- Use GitHub-flavored Markdown. Ensure clean spacing and logical flow.
- Include tables where appropriate, code blocks with language highlighting, blockquotes, lists, inline code, callouts, and emphasis.

2. TECHNICAL ACCURACY:
- Prioritize correct hardware specifications, realistic networking/latency/throughput calculations, accurate APIs, and correct mathematical reasoning.
- Use proper LaTeX when formulas are necessary.
- NO invented benchmarks or fabricated technical facts. Clearly indicate when something is uncertain rather than presenting speculation as fact.

3. MERMAID DIAGRAMS (MANDATORY IF USEFUL):
- When useful, generate valid Mermaid diagrams (flowcharts, sequence diagrams, architecture diagrams, pie charts, etc.). Ensure they are syntactically correct and reflect the actual system or process.

4. DEVELOPER & GAMER FOCUS:
- For development topics: Explain why something works, not just how. Include practical examples, copy-paste-ready commands, explain terminal utilities, mention installation methods, and discuss performance implications, architecture, debugging, and best practices.
- For gaming/hardware topics (${postType}): Discuss rendering pipelines, graphics APIs, frame pacing, CPU/GPU bottlenecks, VRAM usage, shaders, anti-cheat, engine behavior, optimization, and concrete benchmark context and performance numbers. Analyze game legacies and technical achievements without sensational claims.

5. EXTERNAL LINK POLICY:
- Prefer official documentation, secure HTTPS links only, and authoritative sources (official docs, standards bodies, vendor docs). Avoid dubious sources.

6. CONTENT RESTRICTIONS:
- Remain professional. Avoid explicit material or unsupported political commentary. Stay strictly focused on technology, software engineering, hardware, AI, gaming, and infrastructure.

Return the generated post in markdown format with a frontmatter block enclosed by "---" at the very top. Do NOT wrap the entire response in a markdown code block.

FORMAT:
---
title: [The blog title]
excerpt: [One-sentence summary under 180 characters]
tags: [tag1, tag2, tag3, tag4]
slug: url-friendly-slug-${today}
---

[Full markdown content goes here]`;

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text();
      fs.appendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen] NIM API error: ${response.status} ${errText}\n`);
      console.error(`[BlogGen] NIM API error: ${response.status} ${errText}`);
      return null;
    }

    const data = await response.json();
    const rawContent = (data.choices?.[0]?.message?.content ?? "").trim();

    // Parse frontmatter
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);
    if (!match) {
      fs.appendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen] Frontmatter mismatch. Raw content sample: ${rawContent.slice(0, 300)}\n`);
      console.error("[BlogGen] Frontmatter match failed");
      return null;
    }

    const fmText = match[1];
    const content = match[2].trim();

    const title = fmText.match(/^title:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType} — ${today}`;
    const excerpt = fmText.match(/^excerpt:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
    const slug = fmText.match(/^slug:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType.toLowerCase().replace(/\s+/g, "-")}-${today}`;
    const tagsRaw = fmText.match(/^tags:\s*\[(.*?)\]/m)?.[1] ?? fmText.match(/^tags:\s*(.*)$/m)?.[1] ?? "";
    const tags = tagsRaw
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((t: string) => t.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);

    fs.appendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen] Successfully generated post: ${title}\n`);
    const sanitizedContent = sanitizeMermaid(content);
    return { slug, title, excerpt, tags, content: sanitizedContent };
  } catch (err: any) {
    fs.appendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen] Generation error: ${err?.message || err}\n`);
    console.error("[BlogGen] Generation error:", err);
    return null;
  }
}

async function writeToSanity(
  post: { slug: string; title: string; excerpt: string; tags: string[]; content: string },
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  publishedAt: string,
  imageAssetRef?: string
): Promise<boolean> {
  const logFilePath = path.join(process.cwd(), "generate.log");
  try {
    // Check if a post with this slug already exists to avoid duplicates
    const existing = await sanityWriteClient.fetch(
      `*[_type == "gamingPost" && slug.current == $slug][0]._id`,
      { slug: post.slug }
    );
    if (existing) {
      fs.appendFileSync(logFilePath, `[BlogGen] Post already exists for slug in Sanity: ${post.slug}\n`);
      console.log(`[BlogGen] Post already exists for slug: ${post.slug}`);
      return false;
    }

    await sanityWriteClient.create({
      _type: "gamingPost",
      title: post.title,
      slug: { _type: "slug", current: post.slug },
      category: postType,
      excerpt: post.excerpt,
      markdownBody: post.content,
      tags: post.tags,
      author: "Mission Control Intel",
      aiGenerated: true,
      publishedAt: publishedAt,
      ...(imageAssetRef && {
        mainImage: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: imageAssetRef,
          },
        },
      }),
    });

    fs.appendFileSync(logFilePath, `[BlogGen] Saved to Sanity successfully: ${post.slug}\n`);
    console.log(`[BlogGen] Saved to Sanity: ${post.slug}`);
    return true;
  } catch (err: any) {
    fs.appendFileSync(logFilePath, `[BlogGen] Sanity write error: ${err?.message || err}\n`);
    console.error("[BlogGen] Sanity write error:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NVIDIA_API_KEY not configured" }, { status: 500 });
  }
  if (!process.env.SANITY_API_TOKEN) {
    return NextResponse.json({ error: "SANITY_API_TOKEN not configured. Generate an Editor token at sanity.io/manage." }, { status: 500 });
  }

  // Fetch all RSS feeds in parallel
  const feedResults = await Promise.allSettled(
    GAMING_RSS_FEEDS.map((feed) => fetchRSSFeed(feed.url, feed.label))
  );

  const allItems: FeedItem[] = feedResults.flatMap((r) =>
    r.status === "fulfilled" ? r.value : []
  );

  let gpuItems = allItems.filter((i) =>
    /GPU|RTX|RX \d|NVIDIA|AMD|Intel Arc|VRAM|benchmark|performance/i.test(i.title)
  );
  if (gpuItems.length < 2) {
    gpuItems = [
      {
        title: "NVIDIA RTX 5090 Blackwell Architecture Specs Leaked",
        link: "https://www.tomshardware.com/",
        description: "Recent leaks suggest the upcoming Blackwell RTX 5090 will feature 24,576 CUDA cores, 32GB of GDDR7 memory, and a 512-bit bus width, yielding significant performance gains over Ada Lovelace.",
        source: "Tom's Hardware"
      },
      {
        title: "AMD Radeon RX 8000 Series to Target Mid-Range GPU Market",
        link: "https://www.eurogamer.net/",
        description: "Reports indicate AMD is shifting focus away from extreme high-end graphics cards, aiming instead to capture the bulk of the market with aggressive pricing on RDNA4 mid-range models.",
        source: "Eurogamer"
      }
    ];
  }

  let gameItems = allItems.filter((i) => !gpuItems.some((gpu) => gpu.title === i.title));
  if (gameItems.length < 2) {
    gameItems = [
      {
        title: "GTA VI Release Window Confirmed for Fall 2025 by Take-Two",
        link: "http://feeds.ign.com/ign/all",
        description: "Take-Two Interactive narrowed the release window for Rockstar Games' highly anticipated Grand Theft Auto VI during its latest earnings report, confirming a launch in Fall 2025.",
        source: "IGN"
      },
      {
        title: "Elden Ring: Shadow of the Erdtree DLC Reviews Praised as Masterpiece",
        link: "https://kotaku.com/rss",
        description: "FromSoftware's massive expansion Shadow of the Erdtree has received critical acclaim, with reviewers hailing its challenging boss fights, intricate level design, and deep lore additions.",
        source: "Kotaku"
      }
    ];
  }

  const results: { type: string; slug: string; saved: boolean }[] = [];
  const logFile = path.join(process.cwd(), "generate.log");
  
  // Clean up all existing gaming posts from Sanity to start fresh
  try {
    await sanityWriteClient.delete({ query: '*[_type == "gamingPost"]' });
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] Deleted old posts. Blog generation started. Collected ${allItems.length} feed items.\n`);
  } catch (err: any) {
    fs.writeFileSync(logFile, `[${new Date().toISOString()}] Failed to delete old posts: ${err?.message || err}. Blog generation started.\n`);
  }

  // Initialize HuggingFace client
  const hfClient = new InferenceClient(process.env.HF_TOKEN);

  // Generate and save GPU news post
  if (gpuItems.length >= 2) {
    const post = await generateBlogPost(gpuItems, "GPU News", apiKey);
    if (post) {
      let imageAssetRef = undefined;
      try {
        const imageBlob = await hfClient.textToImage({
            provider: "hf-inference",
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: `A highly detailed gaming or tech illustration for a blog post titled: ${post.title}. ${post.tags.join(', ')}`,
            parameters: { num_inference_steps: 4 },
        }, {
            outputType: "blob"
        });
        
        // Convert Blob to Buffer for Sanity upload
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        
        // Upload to Sanity
        const asset = await sanityWriteClient.assets.upload('image', imageBuffer, {
          filename: `${post.slug}-cover.png`
        });
        imageAssetRef = asset._id;
      } catch (imgErr: any) {
        fs.appendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen] Image generation/upload failed: ${imgErr?.message || imgErr}\n`);
        console.error("[BlogGen] Image generation/upload failed:", imgErr);
      }

      const publishedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const saved = await writeToSanity(post, "GPU News", publishedAt, imageAssetRef);
      results.push({ type: "GPU News", slug: post.slug, saved });
    }
  }

  // Generate and save game news roundup
  if (gameItems.length >= 2) {
    const post = await generateBlogPost(gameItems, "Game News", apiKey);
    if (post) {
      let imageAssetRef = undefined;
      try {
        const imageBlob = await hfClient.textToImage({
            provider: "hf-inference",
            model: "black-forest-labs/FLUX.1-schnell",
            inputs: `A highly detailed gaming or tech illustration for a blog post titled: ${post.title}. ${post.tags.join(', ')}`,
            parameters: { num_inference_steps: 4 },
        }, {
            outputType: "blob"
        });
        
        // Convert Blob to Buffer for Sanity upload
        const imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
        
        // Upload to Sanity
        const asset = await sanityWriteClient.assets.upload('image', imageBuffer, {
          filename: `${post.slug}-cover.png`
        });
        imageAssetRef = asset._id;
      } catch (imgErr) {
        console.error("[BlogGen] Image generation/upload failed:", imgErr);
      }

      const publishedAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
      const saved = await writeToSanity(post, "Game News", publishedAt, imageAssetRef);
      results.push({ type: "Game News", slug: post.slug, saved });
    }
  }

  return NextResponse.json({
    success: true,
    generated: results.filter((r) => r.saved).length,
    posts: results,
    feedItemsCollected: allItems.length,
  });
}

// Allow GET for manual one-off trigger in dev
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Use POST in production" }, { status: 405 });
  }
  return POST(request);
}
