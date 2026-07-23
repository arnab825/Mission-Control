import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { InferenceClient } from "@huggingface/inference";
import fs from "fs";
import path from "path";
import { formatDateToIST } from "@/lib/blog";

export function safeWriteFileSync(filePath: string, content: string | Buffer, options?: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, options);
  } catch (err) {
    console.warn(`[SafeWrite] Failed to write file ${filePath}:`, err);
  }
}

export function safeAppendFileSync(filePath: string, content: string) {
  try {
    fs.appendFileSync(filePath, content);
  } catch (err) {
    console.warn(`[SafeWrite] Failed to append to file ${filePath}:`, err);
  }
}

export const GAMING_RSS_FEEDS = [
  { url: "http://feeds.ign.com/ign/all", label: "IGN", type: "gaming" },
  { url: "https://kotaku.com/rss", label: "Kotaku", type: "gaming" },
  { url: "https://www.eurogamer.net/?format=rss", label: "Eurogamer", type: "gaming" },
  { url: "https://feeds.anandtech.com/anandtech/anandtech.xml", label: "AnandTech", type: "hardware" },
  { url: "https://www.tomshardware.com/feeds/all", label: "Tom's Hardware", type: "hardware" },
];

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  source: string;
}

export async function fetchRSSFeed(feedUrl: string, label: string): Promise<FeedItem[]> {
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

export function sanitizeMermaid(content: string): string {
  if (!content) return content;
  return content.replace(/```mermaid([\s\S]*?)```/g, (match, mermaidCode) => {
    let code = mermaidCode;

    // 1. Normalize flowchart link arrows with pipe labels (fix spacing, inner padding, & trailing '>')
    code = code.replace(/(-->|---|==>|-\.->)\s*\|\s*([^|]+?)\s*\|>?\s*/g, "$1|$2| ");

    // 2. Fix unquoted node labels containing spaces/parentheses/brackets by quoting them
    code = code.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)\]/g, '$1["$2"]');
    code = code.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)\)/g, '$1("$2")');
    code = code.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)\}/g, '$1{"$2"}');

    // 3. Fix unclosed brackets/parentheses/braces (e.g., B[Supporting Talent)
    code = code.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1["$2"]');
    code = code.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1("$2")');
    code = code.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1{"$2"}');

    // 4. Fix pie chart titles (remove colon)
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

export async function generateBlogPostWithModel(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  apiKey: string,
  targetDate: Date,
  modelId: string
): Promise<{ slug: string; title: string; excerpt: string; tags: string[]; content: string; imagePrompt?: string } | null> {
  const today = targetDate.toISOString().split("T")[0];
  const headlines = items
    .slice(0, 8)
    .map((i, idx) => `${idx + 1}. [${i.source}] ${i.title}\n   ${i.description}`)
    .join("\n\n");

  const categoryInstructions = {
    "GPU News": "Focus on current news, releases, product specifications, performance benchmarks, and leaks about graphics processors, CPUs, memory, or fabrication technology.",
    "Game News": "Focus on current news about game releases, launch dates, developer announcements, game engine updates, patches, or graphics API features.",
    "Hardware Deep-Dive": "Focus on a detailed, technical, or architectural deep-dive explaining the underlying physics, science, or computer architecture of a hardware technology (e.g. how ray tracing pipelines operate, memory controller physics, CUDA/Tensor core operation, or thermal throttles). Do not just write a news report.",
    "Game Revisit": "Focus on a retrospective look, post-mortem, or engine design analysis of a classic, retro, or older game. Discuss its historical rendering engine architecture, how it bypassed physical console/system constraints, or code-level development triumphs."
  }[postType];

  const prompt = `You are an expert gaming journalist, technical writer, and SEO specialist writing for a high-quality developer and gamer audience.

Today is ${today}. Based on the following real headlines and news items, write a comprehensive blog post.

HEADLINES:
${headlines}

ROLE & OBJECTIVE:
Generate a highly engaging, accurate, and completely unique blog post about these news items, hardware, or updates.

1. DYNAMIC CONTENT & VARIANCE:
- NEVER reuse the same phrasing, structural hooks, or introductory sentences across different articles.
- The post must have a distinct angle based entirely on the provided headlines.

2. REQUIREMENTS & STANDARDS:
- Post type: ${postType}
- Category Focus: ${categoryInstructions}
- Tone: Sharp, technical, authoritative. Write as an experienced technology journalist, engineer, or game analyst—not as a generic AI. Avoid repetitive AI clichés and generic introductions. Blend technical depth with readability.
- Length: 700-900 words. Start with a compelling introduction paragraph and include a brief ## Conclusion section.

3. MARKDOWN FORMATTING:
- Use proper heading hierarchy (#, ##, ###, ####). Include 3-4 structured sections with ## headers.
- Use GitHub-flavored Markdown. Ensure clean spacing and logical flow.
- Include tables where appropriate, code blocks with language highlighting (for actual programming code examples like JavaScript, Python, Bash, HTML, JSON, etc.), blockquotes, lists, inline code, callouts, and emphasis.
- CRITICAL: NEVER wrap normal text, headings, or bulleted/numbered lists inside "\`\`\`markdown" or "\`\`\`md" code blocks. Standard markdown content must be written directly in the post body, not enclosed in code blocks.

4. TECHNICAL ACCURACY:
- Prioritize correct hardware specifications, realistic networking/latency/throughput calculations, accurate APIs, and correct mathematical reasoning.
- Use proper LaTeX when formulas are necessary.
- NO invented benchmarks or fabricated technical facts. Clearly indicate when something is uncertain rather than presenting speculation as fact.

5. MERMAID DIAGRAMS (MANDATORY IF USEFUL):
- When useful, generate valid Mermaid diagrams (flowcharts, sequence diagrams, architecture diagrams, pie charts, etc.). Ensure they are syntactically correct and reflect the actual system or process.
- For flowcharts, NEVER use spaces inside edge labels. Use '-->|text|' instead of '-->| text |'.

6. DEVELOPER & GAMER FOCUS:
- For development topics: Explain why something works, not just how. Include practical examples, copy-paste-ready commands, explain terminal utilities, mention installation methods, and discuss performance implications, architecture, debugging, and best practices.
- For gaming/hardware topics (${postType}): Discuss rendering pipelines, graphics APIs, frame pacing, CPU/GPU bottlenecks, VRAM usage, shaders, anti-cheat, engine behavior, optimization, and concrete benchmark context and performance numbers. Analyze game legacies and technical achievements without sensational claims.

7. EXTERNAL LINK POLICY:
- Prefer official documentation, secure HTTPS links only, and authoritative sources (official docs, standards bodies, vendor docs). Avoid dubious sources.

8. CONTENT RESTRICTIONS:
- Remain professional. Avoid explicit material or unsupported political commentary. Stay strictly focused on technology, software engineering, hardware, AI, gaming, and infrastructure.
- NO ADS, NO BLOAT, NO PROMOTIONS: The article must be strictly informational and analytical. Do not include promotional language, advertisements, sponsored placements, or calls to action (e.g. "Buy now", "Subscribe to our channel", "Click here to subscribe"). Cut out marketing fluff and bloated introductory paragraphs.
- Do NOT generate any harmful, unsafe, hateful, or 18+ / adult-related content.

9. SCHEDULING & PARSING COMPLIANCE:
- Return the output strictly in the requested markdown format with frontmatter at the very top.
- Do not include any conversational filler (like "Here is your blog post:") outside of the frontmatter and content structure.

FORMAT:
---
title: [The blog title]
meta_description: [A snappy, click-worthy summary of THIS specific article, written in the active voice. Must be exactly between 120-150 characters.]
tags: [tag1, tag2, tag3, tag4]
slug: [Generate a unique, lowercase, hyphen-separated URL string based on the title, e.g. "intel-core-ultra-gaming-performance"]
image_prompt: A high-resolution, close-up shot of [Specific Topic/Hardware/Character] with [Specific Lighting/Setting (e.g. cyberpunk neon lighting, moody ambient desk setup)], vibrant color grading, no text, photorealistic style.
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
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(40000), // Reduce LLM timeout to 40s
    });

    if (!response.ok) {
      const errText = await response.text();
      safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}][${modelId}] NIM API error: ${response.status} ${errText}\n`);
      console.error(`[BlogGen][${postType}][${modelId}] NIM API error: ${response.status} ${errText}`);
      return null;
    }

    const data = await response.json();
    const rawContent = (data.choices?.[0]?.message?.content ?? "").trim();

    // Parse frontmatter
    const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
    const match = rawContent.match(frontmatterRegex);
    if (!match) {
      safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}][${modelId}] Frontmatter mismatch. Raw content sample: ${rawContent.slice(0, 300)}\n`);
      console.error(`[BlogGen][${postType}][${modelId}] Frontmatter match failed`);
      return null;
    }

    const fmText = match[1];
    const content = match[2].trim();

    const title = fmText.match(/^title:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType} — ${today}`;
    const excerpt = (fmText.match(/^meta_description:\s*(.*)$/m)?.[1] ?? fmText.match(/^excerpt:\s*(.*)$/m)?.[1])?.replace(/^["']|["']$/g, "").trim() ?? "";
    let slug = fmText.match(/^slug:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType.toLowerCase().replace(/\s+/g, "-")}-${today}`;
    
    // Ensure slug strictly ends with the YYYY-MM-DD date suffix to prevent duplication and collisions
    if (!slug.endsWith(today)) {
      slug = `${slug}-${today}`;
    }

    const imagePrompt = fmText.match(/^image_prompt:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? "";
    const tagsRaw = fmText.match(/^tags:\s*\[(.*?)\]/m)?.[1] ?? fmText.match(/^tags:\s*(.*)$/m)?.[1] ?? "";
    const tags = tagsRaw
      .replace(/[\[\]]/g, "")
      .split(",")
      .map((t: string) => t.replace(/^["']|["']$/g, "").trim())
      .filter(Boolean);

    const cleanContent = content
      .replace(/```(?:markdown|md)\r?\n([\s\S]*?)\r?\n```/gi, "$1")
      .replace(/```table\r?\n([\s\S]*?)\r?\n```/gi, "$1");
    const sanitizedContent = sanitizeMermaid(cleanContent);
    return { slug, title, excerpt, tags, content: sanitizedContent, imagePrompt };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}][${modelId}] Generation error: ${errMsg}\n`);
    console.error(`[BlogGen][${postType}][${modelId}] Generation error:`, err);
    return null;
  }
}

export async function generateBlogPost(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  apiKey: string,
  targetDate: Date = new Date()
): Promise<{ slug: string; title: string; excerpt: string; tags: string[]; content: string; imagePrompt?: string } | null> {
  
  // Try with primary model
  let result = await generateBlogPostWithModel(items, postType, apiKey, targetDate, "meta/llama-3.1-8b-instruct");
  
  // Fallback if primary model fails
  if (!result) {
    safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] Primary model failed. Falling back to mistralai/mixtral-8x7b-instruct-v0.1\n`);
    result = await generateBlogPostWithModel(items, postType, apiKey, targetDate, "mistralai/mixtral-8x7b-instruct-v0.1");
  }
  
  if (result) {
    safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] [LLM OK] Content generated successfully.\n`);
  }
  return result;
}

export async function writeToMongoDB(
  post: { slug: string; title: string; excerpt: string; tags: string[]; content: string },
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  publishedAt: string,
  coverImage?: string
): Promise<boolean> {
  const logFilePath = path.join(process.cwd(), "generate.log");
  try {
    await connectDB();
    // Check if a post with this slug already exists to avoid duplicates
    const existing = await GamingPost.findOne({ slug: post.slug });
    if (existing) {
      safeAppendFileSync(logFilePath, `[BlogGen][${postType}] Post already exists for slug in MongoDB: ${post.slug}\n`);
      console.log(`[BlogGen][${postType}] Post already exists for slug: ${post.slug}`);
      return false;
    }

    await GamingPost.create({
      title: post.title,
      slug: post.slug,
      category: postType,
      excerpt: post.excerpt,
      markdownBody: post.content,
      tags: post.tags,
      author: "Mission Control Intel",
      aiGenerated: true,
      publishedAt: new Date(publishedAt),
      coverImage,
    });

    safeAppendFileSync(logFilePath, `[BlogGen][${postType}] [SAVED] Saved to MongoDB successfully: ${post.slug}\n`);
    console.log(`[BlogGen][${postType}] Saved to MongoDB: ${post.slug}`);
    return true;
  } catch (err: unknown) {
    if (process.env.NODE_ENV !== "production") {
      const msg = `[BlogGen][${postType}] MongoDB write skipped: database not available locally (saved post locally instead).`;
      safeAppendFileSync(logFilePath, `${msg}\n`);
      console.log(msg);
    } else {
      const errMsg = err instanceof Error ? err.message : String(err);
      safeAppendFileSync(logFilePath, `[BlogGen][${postType}] [FAILED] MongoDB write error: ${errMsg}\n`);
      console.error(`[BlogGen][${postType}] MongoDB write error:`, err);
    }
    return false;
  }
}

export function writeToLocalMdx(
  post: { slug: string; title: string; excerpt: string; tags: string[]; content: string },
  postType: string,
  publishedAt: string,
  coverImage?: string
) {
  const contentDir = path.join(process.cwd(), "content/blog");
  const dateStr = formatDateToIST(publishedAt);
  const mdxContent = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: "${dateStr}"
author: "Mission Control Intel"
excerpt: "${post.excerpt.replace(/"/g, '\\"')}"
category: "${postType}"
tags: ${JSON.stringify(post.tags)}
aiGenerated: true
${coverImage ? `coverImage: "${coverImage}"` : ""}
---

${post.content}
`;
  const filePath = path.join(contentDir, `${post.slug}.mdx`);
  safeWriteFileSync(filePath, mdxContent, "utf8");
  safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] [SAVED] Saved to local MDX: ${filePath}\n`);
}

export async function generateImageWithPollinations(prompt: string): Promise<Buffer> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?nologo=true&width=1024&height=768&model=flux`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Pollinations API failed: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function generateAndSavePost(
  currentTopic: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  targetDate: Date,
  apiKey: string,
  hfToken?: string
): Promise<{ type: string; slug: string; saved: boolean } | null> {
  const isHardware = (currentTopic === "GPU News" || currentTopic === "Hardware Deep-Dive");
  const logFile = path.join(process.cwd(), "generate.log");
  
  safeAppendFileSync(logFile, `[${new Date().toISOString()}] [START] Generating post for ${currentTopic}\n`);

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

  let itemsToUse: FeedItem[];

  if (currentTopic === "GPU News") {
    itemsToUse = gpuItems.slice(0, Math.ceil(gpuItems.length / 2));
  } else if (currentTopic === "Hardware Deep-Dive") {
    itemsToUse = gpuItems.slice(Math.floor(gpuItems.length / 2));
  } else if (currentTopic === "Game News") {
    itemsToUse = gameItems.slice(0, Math.ceil(gameItems.length / 2));
  } else { // Game Revisit
    itemsToUse = gameItems.slice(Math.floor(gameItems.length / 2));
  }

  // Fall back to entire array if slicing left too few items (need at least 2)
  if (itemsToUse.length < 2) {
    itemsToUse = isHardware ? gpuItems : gameItems;
  }

  if (itemsToUse.length >= 2) {
    const post = await generateBlogPost(itemsToUse, currentTopic, apiKey, targetDate);
    if (post) {
      let localCoverPath = undefined;
      let imageBuffer: Buffer | undefined = undefined;

      try {
        try {
          // Try Pollinations first since it's free and unlimited
          let defaultPrompt = "";
          if (isHardware) {
            defaultPrompt = `${post.title}. Futuristic hardware, tech concept art, glowing neon accents, 8k resolution, cyberpunk style.`;
          } else {
            defaultPrompt = `${post.title}. Stylized gaming concept art, high-tech HUD elements, colorful neon game design aesthetic, 8k resolution.`;
          }
          const finalPrompt = post.imagePrompt || defaultPrompt;
          imageBuffer = await generateImageWithPollinations(finalPrompt);
        } catch (pollError) {
          console.warn(`[BlogGen][${currentTopic}] Pollinations failed, falling back to HuggingFace:`, pollError);
          if (hfToken) {
            const hfClient = new InferenceClient(hfToken);
            const imageBlob = await hfClient.textToImage({
              provider: "hf-inference",
              model: "black-forest-labs/FLUX.1-schnell",
              inputs: post.imagePrompt || `A highly detailed gaming or tech illustration for a blog post titled: ${post.title}. ${post.tags.join(', ')}`,
              parameters: { num_inference_steps: 4 },
            }, {
              outputType: "blob"
            });
            imageBuffer = Buffer.from(await imageBlob.arrayBuffer());
          }
        }

        if (imageBuffer) {
            // Save locally
            const publicDir = path.join(process.cwd(), "public/images/blog");
            const imagePath = path.join(publicDir, `${post.slug}.png`);
            safeWriteFileSync(imagePath, imageBuffer);
            localCoverPath = `/images/blog/${post.slug}.png`;
            safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] [IMAGE OK] Cover image generated and saved.\n`);
        }
      } catch (imgErr: unknown) {
        const errMsg = imgErr instanceof Error ? imgErr.message : String(imgErr);
        safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] Local image generation/saving failed: ${errMsg}\n`);
        console.error(`[BlogGen][${currentTopic}] Local image generation/saving failed:`, imgErr);
        localCoverPath = isHardware ? "/images/gpu-placeholder.png" : "/images/game-placeholder.png";
      }

      // Get the target date components in IST (Asia/Kolkata)
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      });
      const parts = formatter.formatToParts(targetDate);
      const istYear = Number(parts.find(p => p.type === 'year')?.value);
      const istMonth = Number(parts.find(p => p.type === 'month')?.value);
      const istDay = Number(parts.find(p => p.type === 'day')?.value);

      // Normalize publication time to exactly 04:00 AM IST (22:30 UTC of same day)
      const postDate = new Date(Date.UTC(istYear, istMonth - 1, istDay, 4, 0, 0, 0) - 5.5 * 60 * 60 * 1000);
      const publishedAt = postDate.toISOString();

      const saved = await writeToMongoDB(post, currentTopic, publishedAt, localCoverPath);
      writeToLocalMdx(post, currentTopic, publishedAt, localCoverPath);
      
      if (!saved) {
          safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] [FAILED] Post was generated but DB write returned false.\n`);
      }
      return { type: currentTopic, slug: post.slug, saved };
    } else {
        safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] [FAILED] No post returned from LLM.\n`);
    }
  } else {
      safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] [FAILED] Not enough feed items.\n`);
  }
  return null;
}
