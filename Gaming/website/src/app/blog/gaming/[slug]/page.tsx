import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import connectDB from "@/lib/mongodb";
import GamingPost from "@/models/GamingPost";
import { ArrowLeft, Calendar, Share2, Tag, Bot } from "lucide-react";
import { headers } from "next/headers";
import ShareButtons from "@/components/ShareButtons";
import { formatDateToIST, getPostData } from "@/lib/blog";
import Mermaid from "@/components/Mermaid";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
  "Game News":          { color: "text-neon-green",   bg: "bg-neon-green/10",   border: "border-neon-green/20" },
  "GPU News":           { color: "text-neon-purple", bg: "bg-neon-purple/10", border: "border-neon-purple/20" },
  "Game Revisit":       { color: "text-neon-yellow",  bg: "bg-neon-yellow/10",  border: "border-neon-yellow/20" },
  "Hardware Deep-Dive": { color: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20" },
};

interface MDXPreProps {
  children?: React.ReactElement<{
    className?: string;
    children?: string;
  }>;
}

const mdxComponents = {
  pre: ({ children }: MDXPreProps) => {
    const codeProps = children?.props;
    if (codeProps && codeProps.className === "language-mermaid") {
      return <Mermaid chart={codeProps.children || ""} />;
    }
    return <pre>{children}</pre>;
  }
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

export default async function GamingBlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  await connectDB();
  const dbPost = await GamingPost.findOne({ slug }).lean();

  let post: GamingPostDisplay | null = null;
  if (dbPost) {
    post = {
      title: dbPost.title,
      category: dbPost.category,
      excerpt: dbPost.excerpt,
      markdownBody: dbPost.markdownBody,
      tags: dbPost.tags,
      author: dbPost.author,
      aiGenerated: dbPost.aiGenerated,
      publishedAt: dbPost.publishedAt.toISOString(),
      coverImage: dbPost.coverImage,
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
  const host = headersList.get("host") || "aero-mission-control.dev";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const shareHost = isLocal ? "aero-mission-control.dev" : host;
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
          <article className="glass-panel p-6 sm:p-8 md:p-12 relative overflow-hidden h-full flex flex-col rounded-xl border border-white/5">
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
            
            {post.coverImage ? (
              <div className="mb-10 rounded-xl overflow-hidden border border-white/10 shadow-[0_0_40px_rgba(118,185,0,0.1)] relative z-10">
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-auto object-cover max-h-[450px]"
                />
              </div>
            ) : null}
            
            <div className="prose prose-invert prose-headings:font-display prose-headings:text-white prose-a:text-neon-green max-w-none flex-1 relative z-10 leading-relaxed text-sm sm:text-base text-gray-300">
              <MDXRemote 
                source={post.markdownBody || ""} 
                components={mdxComponents} 
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [rehypeKatex],
                  }
                }}
              />
            </div>
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
