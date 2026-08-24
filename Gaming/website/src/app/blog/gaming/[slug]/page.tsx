import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote/rsc";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { ArrowLeft, Calendar, Share2, Tag, Bot } from "lucide-react";
import { headers } from "next/headers";
import ShareButtons from "@/components/ShareButtons";
import SafeBlogImage from "@/components/SafeBlogImage";
import { formatDateToIST, getPostData } from "@/lib/blog";
import { AdSenseAdSlot } from "@/components/GoogleAdSense";
import Mermaid from "@/components/Mermaid";
import { convertAsciiToMermaid, isAsciiBoxDiagram } from "@/lib/mermaidUtils";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { BASE_SITE_URL, getBaseUrl } from "@/lib/siteUrl";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const baseUrl = getBaseUrl();

  try {
    await connectDB();
    const dbPost: any = await GamingPost.findOne({ slug }).lean();

    if (dbPost) {
      const coverUrl = dbPost.coverImage && dbPost.coverImage.startsWith("http")
        ? dbPost.coverImage
        : `${baseUrl}/images/blog/${slug}.png`;

      return {
        title: `${dbPost.title} | Mission Control Gaming Intel`,
        description: dbPost.excerpt || dbPost.title,
        keywords: dbPost.tags || ["Gaming", "Hardware", "Benchmarks", "PC Gaming"],
        alternates: {
          canonical: `${baseUrl}/blog/gaming/${slug}`,
        },
        openGraph: {
          title: dbPost.title,
          description: dbPost.excerpt || dbPost.title,
          url: `${baseUrl}/blog/gaming/${slug}`,
          siteName: "Mission Control",
          images: [
            {
              url: coverUrl,
              width: 1200,
              height: 630,
              alt: dbPost.title,
            },
          ],
          type: "article",
          publishedTime: dbPost.publishedAt ? new Date(dbPost.publishedAt).toISOString() : undefined,
        },
        twitter: {
          card: "summary_large_image",
          title: dbPost.title,
          description: dbPost.excerpt || dbPost.title,
          images: [coverUrl],
        },
      };
    }
  } catch (err) {
    console.error("Metadata generation fallback for slug:", slug, err);
  }

  return {
    title: "Gaming Intel & Hardware Analysis | Mission Control",
    description: "In-depth gaming benchmarks, GPU architecture deep-dives, and real-time PC gaming telemetry.",
  };
}

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  "Game News": { color: "text-neon-green", bg: "bg-neon-green/10", border: "border-neon-green/20" },
  "GPU News": { color: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/20" },
  "Game Revisit": { color: "text-neon-yellow", bg: "bg-neon-yellow/10", border: "border-neon-yellow/20" },
  "Hardware Deep-Dive": { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
};

// Server-side: extract ```mermaid blocks and replace with inline MDX JSX.
// We base64-encode the chart to avoid backtick/quote characters that confuse
// the MDX parser when embedded directly in a JSX attribute.
function injectMermaidComponents(content: string): string {
  return content.replace(
    /```mermaid\r?\n([\s\S]*?)\r?\n```/g,
    (_match, code) => {
      // Base64 only contains A-Z a-z 0-9 + / = — safe in any JSX string attribute
      const b64 = Buffer.from(code.trim(), "utf-8").toString("base64");
      return `<MermaidChart b64="${b64}" />`;
    }
  );
}

function MermaidChart({ b64 }: { b64: string }) {
  // Decode server-side (RSC, Buffer is available)
  const chart = Buffer.from(b64, "base64").toString("utf-8");
  return <Mermaid chart={chart} />;
}

const mdxComponents = {
  MermaidChart,
  pre: ({ children, ...rest }: any) => (
    <pre className="bg-obsidian/90 border border-white/10 rounded-xl p-5 overflow-x-auto font-mono text-sm shadow-2xl my-6 text-gray-200 leading-relaxed" {...rest}>
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }: any) => {
    if (className?.includes("language-")) {
      return <code className={`${className} font-mono text-neon-green text-sm`} {...props}>{children}</code>;
    }
    return (
      <code className="bg-white/10 text-neon-green px-1.5 py-0.5 rounded font-mono text-xs border border-white/10" {...props}>
        {children}
      </code>
    );
  },
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto my-6 border border-white/10 rounded-xl bg-obsidian/50 w-full shadow-lg">
      <table className="w-full border-collapse text-left m-0 text-sm" {...props}>
        {children}
      </table>
    </div>
  )
};

interface GamingPostDisplay {
  title: string;
  category: string;
  excerpt: string;
  markdownBody: string;
  tags: string[];
  author: string;
  aiGenerated: boolean;
  publishedAt: string;
  coverImage?: string;
}

function cleanMarkdown(content: string): string {
  if (!content) return "";
  let clean = content;
  // Remove frontmatter if present in markdown body string
  clean = clean.replace(/^---[\s\S]*?---\s*/i, "");

  // Remove outer markdown code fences wrapping whole post
  clean = clean.replace(/^```(?:markdown|md)\r?\n([\s\S]*?)\r?\n```$/gi, "$1");

  // Greedy ASCII diagram block: capture everything from first +---+ line to last +---+ line
  // This handles multi-row ASCII diagrams with vertical arrows between rows
  clean = clean.replace(
    /^[ \t]*\+[-=]{2,}\+.*(?:\n[^`].*)*?\n[ \t]*\+[-=]{2,}\+[^\n]*/gm,
    (match) => {
      if (match.includes("```")) return match;
      const converted = convertAsciiToMermaid(match.trim());
      return `\n\n\`\`\`mermaid\n${converted}\n\`\`\`\n\n`;
    }
  );

  // Strip leftover ASCII connector fragments that appear outside boxes
  // e.g. "^ | | [Class Action Lawsuit] v +----...----+"
  clean = clean.replace(
    /^[ \t]*(?:\^|v|V|\||\|\||\[\s*[^\]]+\s*\]|\+[-=.]{2,}\+)[ \t\|\^vV\[\]\-=+.>:]*$/gm,
    ""
  );

  // Strip leftover inline pipe-table ASCII rows: | Label | ---> | Label |
  clean = clean.replace(
    /^[ \t]*\|[^\n|]+\|(?:[ \t]*[-=]->?[ \t]*\|[^\n|]+\|)*[ \t]*$/gm,
    ""
  );

  // Collapse multiple blank lines into max two
  clean = clean.replace(/\n{3,}/g, "\n\n");

  // Auto-fence unfenced Mermaid diagrams (e.g. graph LR A[...] --> B[...])
  clean = clean.replace(
    /(?:^\/\/[^\n]*\n)?^(graph\s+(?:LR|TD|TB|RL)|sequenceDiagram|gantt|classDiagram|flowchart\s+(?:LR|TD|TB|RL))([\s\S]*?)(?=\n\s*\n\s*#|\n\s*\n\s*\/[^\/]|$(?!\n))/gm,
    (match, p1, p2) => {
      if (match.includes("```")) return match;
      return `\n\`\`\`mermaid\n${p1}${p2.trim()}\n\`\`\`\n`;
    }
  );

  // Auto-fence unfenced code blocks (C#, Python, C++, TypeScript)
  clean = clean.replace(
    /(?:^\/\/\s*Example code[^\n]*\n)?^(public\s+class\s+\w+|import\s+\w+\s*\n\s*def\s+\w+[\s\S]*?)(?=\n\s*\n\s*#|\n\s*\n\s*http|\n\s*\n\s*graph|\n\s*\n\s*class|\n\s*\n\s*##|$(?!\n))/gm,
    (match, p1) => {
      if (match.includes("```")) return match;
      const lang = p1.includes("import ") || p1.includes("def ") ? "python" : "csharp";
      return `\n\`\`\`${lang}\n${p1.trim()}\n\`\`\`\n`;
    }
  );

  // Convert ```latex ... ``` code blocks into rendered KaTeX math blocks & plain text
  clean = clean.replace(/```(?:latex|math)\r?\n([\s\S]*?)\r?\n```/gi, (_match, body) => {
    let text = body
      .replace(/\\documentclass\{[^\}]*\}/gi, "")
      .replace(/\\begin\{document\}/gi, "")
      .replace(/\\end\{document\}/gi, "")
      .trim();

    // Separate plain text preamble from align*/equation math blocks
    const alignMatch = text.match(/(\\begin\{(?:align\*?|equation\*?|gather\*?)\}[\s\S]*?\\end\{(?:align\*?|equation\*?|gather\*?)\})/i);
    if (alignMatch) {
      const mathPart = alignMatch[1];
      const plainTextBefore = text.slice(0, alignMatch.index).trim();
      const plainTextAfter = text.slice((alignMatch.index || 0) + mathPart.length).trim();

      let result = "";
      if (plainTextBefore) result += `\n\n${plainTextBefore}\n\n`;
      result += `$$\n${mathPart}\n$$`;
      if (plainTextAfter) result += `\n\n${plainTextAfter}\n\n`;
      return result;
    }

    return `\n\n$$\n${text}\n$$\n\n`;
  });

  // Trim truncated trailing sentence if post body ends mid-sentence without punctuation
  const trimmed = clean.trim();
  if (trimmed && !/[.!?\`"'\n]$/.test(trimmed)) {
    const lastPunct = Math.max(
      trimmed.lastIndexOf("."),
      trimmed.lastIndexOf("!"),
      trimmed.lastIndexOf("?"),
      trimmed.lastIndexOf("```")
    );
    if (lastPunct > 100) {
      const endOffset = trimmed.substring(lastPunct, lastPunct + 3) === "```" ? 3 : 1;
      clean = trimmed.slice(0, lastPunct + endOffset);
    }
  }

  return clean.trim();
}

export default async function GamingBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  let dbPost: any = null;
  let prevPost: { slug: string; title: string } | null = null;
  let nextPost: { slug: string; title: string } | null = null;

  try {
    await connectDB();
    dbPost = await GamingPost.findOne({ slug }).lean();


    if (dbPost) {
      const prevDb = await GamingPost.findOne({ publishedAt: { $lt: dbPost.publishedAt } })
        .sort({ publishedAt: -1 })
        .select("slug title")
        .lean();
      const nextDb = await GamingPost.findOne({ publishedAt: { $gt: dbPost.publishedAt } })
        .sort({ publishedAt: 1 })
        .select("slug title")
        .lean();

      if (prevDb) {
        prevPost = { slug: (prevDb as any).slug, title: (prevDb as any).title };
      } else {
        const newestDb = await GamingPost.findOne({ slug: { $ne: slug } })
          .sort({ publishedAt: -1 })
          .select("slug title")
          .lean();
        if (newestDb) prevPost = { slug: (newestDb as any).slug, title: (newestDb as any).title };
      }

      if (nextDb) {
        nextPost = { slug: (nextDb as any).slug, title: (nextDb as any).title };
      } else {
        const oldestDb = await GamingPost.findOne({ slug: { $ne: slug } })
          .sort({ publishedAt: 1 })
          .select("slug title")
          .lean();
        if (oldestDb) nextPost = { slug: (oldestDb as any).slug, title: (oldestDb as any).title };
      }
    }

  } catch (error) {
    console.warn("MongoDB Connection Error: IP not whitelisted. Falling back to local post.");
  }

  let post: GamingPostDisplay | null = null;
  if (dbPost) {
    let dbCover = dbPost.coverImage;
    if (dbCover && dbCover.includes(".private.blob.vercel-storage.com")) {
      try {
        const parsed = new URL(dbCover);
        dbCover = `/api/blob?pathname=${encodeURIComponent(parsed.pathname.replace(/^\//, ""))}`;
      } catch { }
    } else if (!dbCover || dbCover.includes("placeholder")) {
      dbCover = `/api/blob?pathname=${encodeURIComponent(`images/blog/${slug}.png`)}`;
    }
    post = {
      title: dbPost.title,
      category: dbPost.category,
      excerpt: dbPost.excerpt,
      markdownBody: dbPost.markdownBody,
      tags: dbPost.tags,
      author: dbPost.author,
      aiGenerated: dbPost.aiGenerated,
      publishedAt: dbPost.publishedAt.toISOString(),
      coverImage: dbCover,
    };
  } else {
    // Fallback to local MDX file
    const mdxPost = getPostData(slug);
    if (mdxPost) {
      post = {
        title: mdxPost.title,
        category: mdxPost.category || "Intel",
        excerpt: mdxPost.excerpt || "",
        markdownBody: mdxPost.content || "",
        tags: mdxPost.tags || [],
        author: mdxPost.author || "Mission Control Intel",
        aiGenerated: mdxPost.aiGenerated || false,
        publishedAt: mdxPost.date,
        coverImage: mdxPost.coverImage,
      };
    }
  }

  if (!post) {
    try {
      const versionFile = path.join(process.cwd(), "../backend/version.json");
      if (fs.existsSync(versionFile)) {
        const rawData = fs.readFileSync(versionFile, "utf-8");
        const data = JSON.parse(rawData);
        const match = (data.changelog || []).find((c: any) => c.version === slug);
        if (match) {
          redirect(`/blog/${slug}`);
        }
      }
    } catch { }
    notFound();
  }


  const date = post.publishedAt ?? "";
  const readTime = Math.max(1, Math.ceil((post.markdownBody?.split(" ").length || 1) / 200));

  const cfg = CATEGORY_CONFIG[post.category] ?? {
    color: "text-neon-green",
    bg: "bg-neon-green/10",
    border: "border-neon-green/20"
  };

  const headersList = await headers();
  const host = headersList.get("host") || "mission-control-roan-seven.vercel.app";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const shareHost = isLocal ? "mission-control-roan-seven.vercel.app" : host;
  const postUrl = `https://${shareHost}/blog/gaming/${slug}`;

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10">

      {/* Reading Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-green via-neon-purple to-neon-green z-50"></div>

      {/* Top Navigation */}
      <Link href="/blog?tab=intel" className="text-gray-400 hover:text-neon-green transition-colors mb-8 inline-flex items-center gap-2 font-display text-sm group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to Gaming Intel
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 xl:gap-12">

        {/* Main Content Column */}
        <div className="lg:col-span-3">
          <article className="glass-panel p-6 sm:p-8 md:p-12 relative overflow-hidden rounded-xl border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 blur-[100px] -mr-20 -mt-20 rounded-full pointer-events-none"></div>

            <header className="mb-10 border-b border-white/10 pb-8 relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`${cfg.bg} ${cfg.color} border ${cfg.border} px-3.5 py-1 rounded-full text-xs font-display font-bold tracking-widest uppercase`}>
                  {post.category || "Intel"}
                </span>

                {post.aiGenerated && (
                  <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3.5 py-1 rounded-full text-xs font-display font-bold tracking-widest uppercase flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI Generated
                  </span>
                )}
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-6 text-white leading-tight">{post.title}</h1>

              <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-gray-400 font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-graphite border border-white/10 flex items-center justify-center text-neon-green font-bold text-xs">AI</div>
                  <span>{post.author || "Mission Control Intel"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <time>{formatDateToIST(date)}</time>
                </div>
                <div className="flex items-center gap-2">
                  <span>{readTime} Min Read</span>
                </div>
              </div>
            </header>

            <div className="mb-10 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(118,185,0,0.1)] relative z-10">
              <SafeBlogImage
                src={post.coverImage}
                alt={post.title}
                category={post.category}
                className="w-full h-auto object-cover max-h-[450px]"
              />
            </div>

            <div className="prose prose-invert prose-headings:font-display prose-headings:text-white prose-a:text-neon-green max-w-none relative z-10 leading-relaxed text-sm sm:text-base text-gray-300">
              {(() => {
                try {
                  return (
                    <MDXRemote
                      source={injectMermaidComponents(cleanMarkdown(post.markdownBody || ""))}
                      components={mdxComponents}
                      options={{
                        mdxOptions: {
                          remarkPlugins: [remarkGfm, remarkMath],
                          rehypePlugins: [rehypeKatex],
                        }
                      }}
                    />
                  );
                } catch (mdxErr) {
                  console.error("MDX Remote render fallback error:", mdxErr);
                  return (
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {cleanMarkdown(post.markdownBody || "")}
                    </div>
                  );
                }
              })()}
            </div>

            {/* Prev / Next Navigation */}
            <footer className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 relative z-10">
              {prevPost ? (
                <Link href={`/blog/gaming/${prevPost.slug}`} className="flex-1 glass-panel p-4 hover:border-neon-green/50 hover:bg-white/5 transition-all group flex flex-col items-start rounded-xl border border-white/10">
                  <span className="text-[10px] text-gray-400 font-display uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-neon-green transition-colors">
                    &larr; Previous Post
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-white line-clamp-1">{prevPost.title}</span>
                </Link>
              ) : <div className="flex-1"></div>}

              {nextPost ? (
                <Link href={`/blog/gaming/${nextPost.slug}`} className="flex-1 glass-panel p-4 hover:border-neon-green/50 hover:bg-white/5 transition-all group flex flex-col items-end text-right rounded-xl border border-white/10">
                  <span className="text-[10px] text-gray-400 font-display uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-neon-green transition-colors">
                    Next Post &rarr;
                  </span>
                  <span className="font-bold text-xs sm:text-sm text-gray-200 group-hover:text-white line-clamp-1">{nextPost.title}</span>
                </Link>
              ) : <div className="flex-1"></div>}
            </footer>
          </article>

        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 sticky top-24 rounded-xl border border-white/5">
            <h4 className="font-display font-bold text-white border-b border-white/10 pb-3 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
              <Share2 className="w-4 h-4 text-neon-green" /> Share Post
            </h4>
            <ShareButtons url={postUrl} title={post.title} />

            <h4 className="font-display font-bold text-white border-b border-white/10 pb-3 mb-4 mt-8 text-xs uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-4 h-4 text-neon-green" /> Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {post.tags && post.tags.length > 0
                ? post.tags.map((tag: string) => (
                  <span key={tag} className="bg-white/5 border border-white/10 text-gray-400 px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider">{tag}</span>
                ))
                : ["Gaming", "News"].map((tag) => (
                  <span key={tag} className="bg-white/5 border border-white/10 text-gray-400 px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider">{tag}</span>
                ))
              }
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
