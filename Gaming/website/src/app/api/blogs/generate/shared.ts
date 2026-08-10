import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { InferenceClient } from "@huggingface/inference";
import fs from "fs";
import path from "path";
import { formatDateToIST } from "@/lib/blog";

async function saveImageBuffer(buffer: Buffer, slug: string, extension: string = "png"): Promise<string> {
  const publicDir = path.join(process.cwd(), "public/images/blog");
  const fileName = `${slug}.${extension}`;
  const localPath = path.join(process.cwd(), "public/images/blog", fileName);
  safeWriteFileSync(localPath, buffer);

  // If Vercel Blob token is configured, upload to cloud for persistent Vercel CDN serving
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      // @ts-ignore
      const { put } = await import("@vercel/blob");
      const blob = await put(`images/blog/${fileName}`, buffer, {
        access: "public",
        addRandomSuffix: false,
      });
      console.log(`[BlogGen] [BLOB OK] Uploaded image to Vercel Blob CDN: ${blob.url}`);
      return blob.url;
    } catch (blobErr: any) {
      console.warn(`[BlogGen] Vercel Blob upload failed, falling back to local path:`, blobErr?.message || blobErr);
    }
  }

  return `/images/blog/${fileName}`;
}

export function safeWriteFileSync(filePath: string, content: string | Buffer, options?: any) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, options);
  } catch (err: any) {
    if (err?.code === "EROFS") {
      try {
        const tmpPath = path.join("/tmp", path.basename(filePath));
        fs.writeFileSync(tmpPath, content, options);
      } catch { }
    } else {
      console.warn(`[SafeWrite] Failed to write file ${filePath}:`, err?.message || err);
    }
  }
}

export function safeAppendFileSync(filePath: string, content: string) {
  const cleanMessage = content.trim();
  if (cleanMessage) {
    console.log(`[BlogGen] ${cleanMessage}`);
  }
  try {
    fs.appendFileSync(filePath, content);
  } catch (err: any) {
    if (err?.code === "EROFS") {
      try {
        fs.appendFileSync(path.join("/tmp", path.basename(filePath)), content);
      } catch { }
    } else {
      console.warn(`[SafeWrite] Failed to append to file ${filePath}:`, err?.message || err);
    }
  }
}

export const GAMING_RSS_FEEDS = [
  { url: "https://www.ign.com/feeds/news.xml", label: "IGN", type: "gaming" },
  { url: "https://kotaku.com/rss", label: "Kotaku", type: "gaming" },
  { url: "https://www.eurogamer.net/?format=rss", label: "Eurogamer", type: "gaming" },
  { url: "https://www.pcgamer.com/rss/", label: "PC Gamer", type: "gaming" },
  { url: "https://www.polygon.com/rss/index.xml", label: "Polygon", type: "gaming" },
  { url: "https://www.gamespot.com/feeds/news/", label: "GameSpot", type: "gaming" },
  { url: "https://www.rockpapershotgun.com/feed", label: "Rock Paper Shotgun", type: "gaming" },
  { url: "https://wccftech.com/feed/", label: "Wccftech", type: "hardware" },
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

function buildPromptForItems(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  targetDate: Date
): string {
  const istFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = istFormatter.formatToParts(targetDate);
  const istYear = parts.find(p => p.type === 'year')?.value;
  const istMonth = parts.find(p => p.type === 'month')?.value;
  const istDay = parts.find(p => p.type === 'day')?.value;
  const today = `${istYear}-${istMonth}-${istDay}`;
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

  return `You are an expert gaming journalist, technical writer, and SEO specialist writing for a high-quality developer and gamer audience.

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
image_prompt: A highly detailed, photorealistic 3D video game concept art or high-tech computer hardware render depicting [Specific Game Character/Combat Scene/Hardware Component mentioned in this article], cinematic volumetric lighting, 8k resolution, Unreal Engine 5 style, no text.

---

[Full markdown content goes here]`;
}

export async function generateBlogPostWithModel(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  apiKey: string,
  targetDate: Date,
  modelId: string
): Promise<{ slug: string; title: string; excerpt: string; tags: string[]; content: string; imagePrompt?: string } | null> {
  const prompt = buildPromptForItems(items, postType, targetDate);

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
    return parseGeneratedBlogResponse(rawContent, postType, targetDate);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}][${modelId}] Generation error: ${errMsg}\n`);
    console.error(`[BlogGen][${postType}][${modelId}] Generation error:`, err);
    return null;
  }
}

function parseGeneratedBlogResponse(
  rawContent: string,
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  targetDate: Date
) {

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(targetDate);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const today = `${year}-${month}-${day}`;

  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = rawContent.match(frontmatterRegex);
  if (!match) {
    return null;
  }

  const fmText = match[1];
  const content = match[2].trim();
  const title = fmText.match(/^title:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType} — ${today}`;
  const excerpt = (fmText.match(/^meta_description:\s*(.*)$/m)?.[1] ?? fmText.match(/^excerpt:\s*(.*)$/m)?.[1])?.replace(/^["']|["']$/g, "").trim() ?? "";
  let rawSlug = fmText.match(/^slug:\s*(.*)$/m)?.[1]?.replace(/^["']|["']$/g, "").trim() ?? `${postType.toLowerCase().replace(/\s+/g, "-")}`;

  let baseSlug = rawSlug.replace(new RegExp(`-${today}$`), "").replace(/[^a-z0-9-]/gi, "-").toLowerCase().replace(/-+/g, "-");

  const categoryTag = postType.toLowerCase().replace(/\s+/g, "-");
  if (!baseSlug.includes(categoryTag)) {
    baseSlug = `${categoryTag}-${baseSlug}`;
  }

  let slug = `${baseSlug}-${today}`;

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
}

async function generateBlogPostWithGemini(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  geminiKey: string,
  targetDate: Date = new Date()
) {
  const prompt = buildPromptForItems(items, postType, targetDate);
  const modelsToTry = [
    process.env.GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest"
  ].filter(Boolean) as string[];



  for (const modelId of modelsToTry) {
    try {
      console.log(`[BlogGen][${postType}] Requesting Gemini model (${modelId})...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096, temperature: 0.7 }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
        const parsed = parseGeneratedBlogResponse(rawContent, postType, targetDate);
        if (parsed) {
          console.log(`[BlogGen][${postType}] SUCCESS with Gemini model: ${modelId}`);
          return parsed;
        }
      } else {
        const errText = await response.text();
        console.warn(`[BlogGen][${postType}][Gemini ${modelId}] HTTP ${response.status}: ${errText.slice(0, 150)}`);
      }
    } catch (err) {
      console.warn(`[BlogGen][${postType}][Gemini ${modelId}] Attempt failed:`, err);
    }
  }

  return null;
}


async function generateBlogPostWithHuggingFace(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  hfToken: string,
  targetDate: Date = new Date()
) {
  const prompt = buildPromptForItems(items, postType, targetDate);
  const modelsToTry = [
    "meta-llama/Llama-3.1-8B-Instruct",
    "mistralai/Mistral-7B-Instruct-v0.3",
    "Qwen/Qwen2.5-72B-Instruct"
  ];

  for (const modelId of modelsToTry) {
    try {
      console.log(`[BlogGen][${postType}] Attempting Hugging Face LLM (${modelId})...`);
      const hf = new InferenceClient(hfToken);
      const res = await hf.chatCompletion({
        model: modelId,
        messages: [{ role: "user", content: prompt }],
        max_tokens: 3000,
        temperature: 0.7,
      });

      const rawContent = res.choices?.[0]?.message?.content?.trim();
      if (rawContent) {
        const parsed = parseGeneratedBlogResponse(rawContent, postType, targetDate);
        if (parsed) {
          console.log(`[BlogGen][${postType}] SUCCESS with Hugging Face model: ${modelId}`);
          return parsed;
        }
      }
    } catch (err) {
      console.warn(`[BlogGen][${postType}][HF ${modelId}] Attempt failed:`, err);
    }
  }
  return null;
}

export async function generateBlogPost(
  items: FeedItem[],
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  apiKey: string,
  targetDate: Date = new Date()
): Promise<{ slug: string; title: string; excerpt: string; tags: string[]; content: string; imagePrompt?: string } | null> {

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const hfToken = process.env.HF_TOKEN;

  // Tier 1: Google Gemini (3.6 / 3.5 / 2.0 / 1.5 Flash)
  if (geminiKey) {
    console.log(`[BlogGen][${postType}] Attempting LLM generation via Gemini Flash...`);
    const res = await generateBlogPostWithGemini(items, postType, geminiKey, targetDate);
    if (res) {
      safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] [LLM OK] Content generated via Gemini Flash.\n`);
      return res;
    }
  }

  // Tier 2: Hugging Face LLM (Llama 3.1 8B / Mistral 7B / Qwen 2.5) if Gemini busy or quota exceeded
  if (hfToken) {
    console.log(`[BlogGen][${postType}] Gemini unavailable/busy. Falling back to Hugging Face LLM...`);
    const hfRes = await generateBlogPostWithHuggingFace(items, postType, hfToken, targetDate);
    if (hfRes) {
      safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] [LLM OK] Content generated via Hugging Face LLM.\n`);
      return hfRes;
    }
  }

  // Tier 3: NVIDIA NIM (meta/llama-3.3-70b-instruct / meta/llama-3.1-8b-instruct)
  if (apiKey) {
    console.log(`[BlogGen][${postType}] Falling back to NVIDIA NIM (meta/llama-3.3-70b-instruct)...`);
    let result = await generateBlogPostWithModel(items, postType, apiKey, targetDate, "meta/llama-3.3-70b-instruct");

    if (!result) {
      console.log(`[BlogGen][${postType}] Falling back to NVIDIA NIM (meta/llama-3.1-8b-instruct)...`);
      result = await generateBlogPostWithModel(items, postType, apiKey, targetDate, "meta/llama-3.1-8b-instruct");
    }

    if (result) {
      safeAppendFileSync(path.join(process.cwd(), "generate.log"), `[BlogGen][${postType}] [LLM OK] Content generated via NVIDIA NIM.\n`);
      return result;
    }
  }

  return null;
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
    let finalSlug = post.slug;
    // Check if a post with this slug already exists to avoid duplicate key errors
    const existing = await GamingPost.findOne({ slug: finalSlug });
    if (existing) {
      const suffix = Math.floor(Math.random() * 899 + 100);
      finalSlug = `${post.slug.replace(/-\d+$/, '')}-${postType.toLowerCase().replace(/\s+/g, '-')}-${suffix}`;
      safeAppendFileSync(logFilePath, `[BlogGen][${postType}] Slug collision detected for '${post.slug}', resolved as '${finalSlug}'\n`);
    }

    await GamingPost.create({
      title: post.title,
      slug: finalSlug,
      markdownBody: post.content,
      content: post.content,
      excerpt: post.excerpt,
      category: postType,
      tags: post.tags,
      author: "Mission Control Intel",
      publishedAt,
      aiGenerated: true,
      coverImage: coverImage || `/images/blog/${finalSlug}.png`,
    });
    safeAppendFileSync(logFilePath, `[BlogGen][${postType}] [SAVED] Saved to MongoDB: ${finalSlug}\n`);
    return true;
  } catch (err: any) {
    safeAppendFileSync(logFilePath, `[BlogGen][${postType}] [ERROR] MongoDB write error: ${err.message}\n`);
    console.error(`[BlogGen][${postType}] MongoDB write error:`, err);
    return false;
  }
}

export function saveLocalMDX(
  post: { slug: string; title: string; excerpt: string; tags: string[]; content: string },
  postType: "Game News" | "GPU News" | "Game Revisit" | "Hardware Deep-Dive",
  dateFormatted: string,
  coverImage?: string
) {
  const contentDir = path.join(process.cwd(), "content/blog");
  const mdxContent = `---
title: "${post.title.replace(/"/g, '\\"')}"
date: "${dateFormatted}"
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

export function generateHighTechSVGCover(title: string, category: string): string {
  const isHardware = category === "GPU News" || category === "Hardware Deep-Dive";

  const primaryColor = isHardware ? "#76b900" : "#fbbf24";
  const secondaryColor = isHardware ? "#a855f7" : "#ec4899";
  const accentColor = isHardware ? "#38bdf8" : "#10b981";
  const bgGradStart = isHardware ? "#090d14" : "#120914";
  const bgGradEnd = isHardware ? "#040609" : "#080409";

  const safeTitle = title.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 576" width="1024" height="576">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${bgGradStart}" />
      <stop offset="100%" stop-color="${bgGradEnd}" />
    </linearGradient>

    <linearGradient id="coreGlow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primaryColor}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${secondaryColor}" stop-opacity="0.2" />
    </linearGradient>

    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <rect width="1024" height="576" fill="url(#bgGrad)" />

  <g opacity="0.15" stroke="${primaryColor}" stroke-width="1">
    ${Array.from({ length: 24 }).map((_, i) => `<line x1="0" y1="${i * 24}" x2="1024" y2="${i * 24}" />`).join("")}
    ${Array.from({ length: 42 }).map((_, i) => `<line x1="${i * 24}" y1="0" x2="${i * 24}" y2="576" />`).join("")}
  </g>

  <g opacity="0.4" stroke="${accentColor}" stroke-width="2" fill="none">
    <path d="M 100 100 L 250 100 L 320 170 L 500 170" />
    <path d="M 924 476 L 774 476 L 704 406 L 524 406" />
    <path d="M 800 120 L 700 120 L 640 180 L 400 180" />
    <circle cx="320" cy="170" r="6" fill="${accentColor}" />
    <circle cx="704" cy="406" r="6" fill="${accentColor}" />
    <circle cx="640" cy="180" r="6" fill="${accentColor}" />
  </g>

  <g transform="translate(512, 288)" filter="url(#glow)">
    ${isHardware ? `
      <rect x="-140" y="-140" width="280" height="280" rx="20" fill="#0b0d13" stroke="${primaryColor}" stroke-width="4" opacity="0.9" />
      <rect x="-100" y="-100" width="200" height="200" rx="12" fill="url(#coreGlow)" stroke="${secondaryColor}" stroke-width="2" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="${primaryColor}" stroke-width="4" />
      <path d="M -30 0 L 30 0 M 0 -30 L 0 30" stroke="${primaryColor}" stroke-width="3" />
    ` : `
      <polygon points="0,-130 115,-65 115,65 0,130 -115,65 -115,-65" fill="#0b0d13" stroke="${primaryColor}" stroke-width="4" opacity="0.9" />
      <polygon points="0,-90 80,-45 80,45 0,90 -80,45 -80,-45" fill="url(#coreGlow)" stroke="${secondaryColor}" stroke-width="2" />
      <circle cx="-35" cy="0" r="18" fill="none" stroke="${primaryColor}" stroke-width="3" />
      <circle cx="35" cy="-15" r="10" fill="${accentColor}" />
      <circle cx="35" cy="15" r="10" fill="${primaryColor}" />
    `}
  </g>

  <rect x="0" y="360" width="1024" height="216" fill="url(#bgGrad)" opacity="0.85" />
  <rect x="48" y="440" width="140" height="28" rx="6" fill="${primaryColor}" opacity="0.2" stroke="${primaryColor}" stroke-width="1.5" />
  <text x="58" y="459" font-family="monospace" font-size="12" font-weight="bold" fill="${primaryColor}" letter-spacing="2">${category.toUpperCase()}</text>
  <text x="48" y="505" font-family="sans-serif" font-size="22" font-weight="900" fill="#ffffff" letter-spacing="-0.5">${safeTitle.slice(0, 55)}${safeTitle.length > 55 ? "..." : ""}</text>
</svg>`;
}

export async function generateImageWithPollinations(prompt: string): Promise<Buffer | null> {
  const cleanPrompt = encodeURIComponent(prompt.slice(0, 250));
  const models = ["flux", "turbo", "sdxl"];

  for (const model of models) {
    try {
      const seed = Math.floor(Math.random() * 899999) + 100000;
      const url = `https://image.pollinations.ai/prompt/${cleanPrompt}?nologo=true&width=1024&height=576&seed=${seed}&model=${model}`;
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(25000)
      });
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        if (arrayBuffer.byteLength > 4000) {
          return Buffer.from(arrayBuffer);
        }
      }
    } catch (err) {
      console.warn(`[BlogGen][Pollinations ${model}] Attempt failed:`, err);
    }
  }
  return null;
}


export async function generateBlogCoverImage(
  prompt: string,
  title: string,
  category: string,
  slug: string,
  hfToken?: string
): Promise<string> {
  const publicDir = path.join(process.cwd(), "public/images/blog");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Tier 1: Google Gemini (Imagen 3) API if key configured
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_IMAGE_API_KEY;
  if (geminiKey) {
    try {
      console.log(`[BlogGen][${category}] Attempting Google Gemini (Imagen 3)...`);
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9", outputMimeType: "image/png" }
        }),
        signal: AbortSignal.timeout(12000)
      });

      if (res.ok) {
        const data = await res.json();
        const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
        if (b64) {
          const buffer = Buffer.from(b64, "base64");
          if (buffer.length > 5000) {
            const savedPath = await saveImageBuffer(buffer, slug, "png");
            console.log(`[BlogGen][${category}] [IMAGE OK] Gemini Imagen 3 saved: ${savedPath}`);
            return savedPath;
          }
        }
      }
    } catch (err) {
      console.warn(`[BlogGen][${category}] Gemini Imagen 3 attempt failed:`, err);
    }
  }

  // Tier 2: Hugging Face Inference API (FLUX.1-schnell)
  const activeHfToken = hfToken || process.env.HF_TOKEN;
  if (activeHfToken) {
    try {
      console.log(`[BlogGen][${category}] Attempting Hugging Face (FLUX.1-schnell)...`);
      const hf = new InferenceClient(activeHfToken);
      const resBlob: any = await hf.textToImage({
        model: "black-forest-labs/FLUX.1-schnell",
        inputs: prompt,
      });
      let buffer: Buffer;
      if (Buffer.isBuffer(resBlob)) {
        buffer = resBlob;
      } else if (typeof resBlob === "string") {
        buffer = Buffer.from(resBlob, "base64");
      } else {
        buffer = Buffer.from(await resBlob.arrayBuffer());
      }

      if (buffer.length > 5000) {
        const savedPath = await saveImageBuffer(buffer, slug, "png");
        console.log(`[BlogGen][${category}] [IMAGE OK] Hugging Face FLUX.1 saved: ${savedPath}`);
        return savedPath;
      }

    } catch (hfErr) {
      console.warn(`[BlogGen][${category}] Hugging Face attempt failed:`, hfErr);
    }
  }


  // Tier 3: Pollinations AI
  try {
    console.log(`[BlogGen][${category}] Attempting Pollinations AI...`);
    const buffer = await generateImageWithPollinations(prompt);
    if (buffer && buffer.length > 4000) {
      const savedPath = await saveImageBuffer(buffer, slug, "png");
      console.log(`[BlogGen][${category}] [IMAGE OK] Pollinations AI saved: ${savedPath}`);
      return savedPath;
    }
  } catch (polErr) {
    console.warn(`[BlogGen][${category}] Pollinations AI attempt failed:`, polErr);
  }

  // Tier 4: Photorealistic 3D Topic Artwork (Guaranteed High-Res PNG)
  const isHardware = category === "GPU News" || category === "Hardware Deep-Dive";
  const sourceImage = isHardware
    ? path.join(process.cwd(), "public/images/gpu-placeholder.png")
    : path.join(process.cwd(), "public/images/game-placeholder.png");

  if (fs.existsSync(sourceImage)) {
    const buffer = fs.readFileSync(sourceImage);
    const savedPath = await saveImageBuffer(buffer, slug, "png");
    console.log(`[BlogGen][${category}] [IMAGE OK] Saved Photorealistic 3D Art: ${savedPath}`);
    return savedPath;
  }

  // Backup fallback
  const svgCode = generateHighTechSVGCover(title, category);
  const savedPath = await saveImageBuffer(Buffer.from(svgCode, "utf8"), slug, "svg");
  return savedPath;
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
      const cleanBase = (post.imagePrompt && post.imagePrompt.length > 10 ? post.imagePrompt : post.title)
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\d]+|Why|How|What|When|[:"'\?\!\-\|\(\)\[\]]/gi, " ")
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);

      const finalPrompt = isHardware
        ? `photorealistic 3d render of ${cleanBase}, high tech computer hardware architecture, glowing neon green metallic heatsink, 8k, no text`
        : `cinematic 3d video game visual concept art of ${cleanBase}, epic action scene, volumetric lighting, photorealistic 8k, no text`;

      const localCoverPath = await generateBlogCoverImage(
        finalPrompt,
        post.title,
        currentTopic,
        post.slug,
        hfToken
      );

      safeAppendFileSync(logFile, `[BlogGen][${currentTopic}] [IMAGE OK] Cover image configured: ${localCoverPath}\n`);


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

      // Normalize publication time to exactly 05:30 AM IST (00:00 UTC of same day)
      const postDate = new Date(Date.UTC(istYear, istMonth - 1, istDay, 5, 30, 0, 0) - 5.5 * 60 * 60 * 1000);
      const publishedAt = postDate.toISOString();

      const saved = await writeToMongoDB(post, currentTopic, publishedAt, localCoverPath);
      saveLocalMDX(post, currentTopic, publishedAt, localCoverPath);

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
