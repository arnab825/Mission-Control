import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getPostData, getSortedPostsData, formatDateToIST, parseBlogDate } from "@/lib/blog";
import { ArrowLeft, Calendar, Clock, User, Share2, MessageSquare, Tag, Check, HelpCircle, Bot, Gamepad2, Cpu } from "lucide-react";
import Mermaid from "@/components/Mermaid";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { headers } from "next/headers";
import ShareButtons from "@/components/ShareButtons";

const mdxComponents = {
  pre: ({ children }: any) => {
    const codeProps = children?.props;
    if (codeProps && codeProps.className === "language-mermaid") {
      return <Mermaid chart={codeProps.children} />;
    }
    return <pre>{children}</pre>;
  }
};

function cleanMarkdown(content: string): string {
  if (!content) return "";
  return content.replace(/```(?:markdown|md)\r?\n([\s\S]*?)\r?\n```/gi, "$1");
}


export async function generateStaticParams() {
  const versionFile = path.join(process.cwd(), "../backend/version.json");
  let slugs: { slug: string }[] = [];
  try {
    const rawData = fs.readFileSync(versionFile, "utf-8");
    const data = JSON.parse(rawData);
    const changelog = data.changelog || [];
    slugs = changelog.map((log: any) => ({
      slug: log.version,
    }));
  } catch (e) {
    // Ignore error
  }
  
  const mdxPosts = getSortedPostsData();
  const mdxSlugs = mdxPosts.map(post => ({ slug: post.id }));
  
  return [...slugs, ...mdxSlugs];
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const versionFile = path.join(process.cwd(), "../backend/version.json");
  
  const headersList = await headers();
  const host = headersList.get("host") || "aero-mission-control.dev";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const shareHost = isLocal ? "aero-mission-control.dev" : host;
  const postUrl = `https://${shareHost}/blog/${slug}`;
  
  let postLog: any = null;
  let prevLog: any = null;
  let nextLog: any = null;

  try {
    const rawData = fs.readFileSync(versionFile, "utf-8");
    const data = JSON.parse(rawData);
    const allChangelogs = data.changelog || [];
    const now = new Date();
    const changelog = allChangelogs.filter((log: any) => new Date(log.date) <= now);
    
    const currentIndex = changelog.findIndex((log: any) => log.version === slug);
    if (currentIndex !== -1) {
      postLog = changelog[currentIndex];
      nextLog = currentIndex > 0 ? changelog[currentIndex - 1] : null;
      prevLog = currentIndex < changelog.length - 1 ? changelog[currentIndex + 1] : null;
    }
  } catch (e) {
    console.error(e);
  }

  const rawMdxPost = getPostData(slug);
  const mdxPost = rawMdxPost && parseBlogDate(rawMdxPost.date) <= new Date() ? rawMdxPost : null;

  if (!postLog && !mdxPost) {
    notFound();
  }

  const isMdx = !!mdxPost;
  const title = isMdx ? mdxPost.title : `v${postLog.version} - ${postLog.title}`;
  const date = isMdx ? mdxPost.date : postLog.date;
  const readTime = isMdx ? Math.max(1, Math.ceil((mdxPost.content?.split(" ").length || 1) / 200)) : Math.max(1, Math.ceil((postLog.highlights?.length || 1) / 2));
  const backLink = isMdx
    ? "/blog?tab=intel"
    : "/blog?tab=logs";
  const backLabel = isMdx
    ? "Gaming Intel"
    : "Transmissions";

  return (
    <div className="min-h-screen pt-32 pb-24 px-4 sm:px-6 max-w-6xl mx-auto w-full relative z-10">
      
      {/* Reading Progress Indicator */}
      <div className="fixed top-0 left-0 w-full h-[2px] bg-gradient-to-r from-neon-green via-neon-purple to-neon-green z-50"></div>

      {/* Top Navigation */}
      <Link href={backLink} className="text-gray-400 hover:text-neon-green transition-colors mb-8 inline-flex items-center gap-2 font-display text-sm group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        Back to {backLabel}
      </Link>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 xl:gap-12">
        
        {/* Main Content Column */}
        <div className="lg:col-span-3">
          <article className="glass-panel p-6 sm:p-8 md:p-12 relative overflow-hidden h-full flex flex-col rounded-xl border border-white/5">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-green/5 blur-[100px] -mr-20 -mt-20 rounded-full pointer-events-none"></div>
            
            <header className="mb-10 border-b border-white/10 pb-8 relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className={`bg-neon-green/10 text-neon-green border border-neon-green/20 px-3.5 py-1 rounded-full text-xs font-display font-bold tracking-widest uppercase`}>
                  {isMdx ? (mdxPost.category || "Gaming Intel") : "Patch Notes"}
                </span>
                {!isMdx && <span className="bg-neon-purple/10 text-neon-purple border border-neon-purple/20 px-3.5 py-1 rounded-full text-xs font-display font-bold tracking-widest uppercase">Update</span>}
                {isMdx && mdxPost.aiGenerated && (
                  <span className="bg-violet-500/10 text-violet-400 border border-violet-500/20 px-3.5 py-1 rounded-full text-xs font-display font-bold tracking-widest uppercase flex items-center gap-1">
                    <Bot className="w-3 h-3" /> AI Generated
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold font-display mb-6 text-white leading-tight">{title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-xs sm:text-sm text-gray-400 font-mono">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-graphite border border-white/10 flex items-center justify-center text-neon-green font-bold text-xs">MC</div>
                  <span>{isMdx ? mdxPost.author || "Mission Control Team" : "Mission Control Team"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <time>{formatDateToIST(date)}</time>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>{readTime} Min Read</span>
                </div>
              </div>
            </header>
            
            <div className="prose prose-invert prose-headings:font-display prose-headings:text-white prose-a:text-neon-green max-w-none flex-1 relative z-10 leading-relaxed text-sm sm:text-base text-gray-300">
              {isMdx ? (
                <MDXRemote
                  source={cleanMarkdown(mdxPost.content || "")}
                  components={mdxComponents}
                  options={{
                    mdxOptions: {
                      remarkPlugins: [remarkGfm, remarkMath],
                      rehypePlugins: [rehypeKatex],
                    },
                  }}
                />
              ) : (
                <>
                  <p className="text-lg sm:text-xl text-gray-200 leading-relaxed mb-8 font-display">
                    Deployment sequence initiated for version {postLog.version}. This transmission contains critical updates to the core engine and agentic capabilities.
                  </p>
                  
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 border-b border-white/5 pb-2 font-display uppercase tracking-wider">Transmission Details</h3>
                  <ul className="space-y-4 pl-0">
                    {postLog.highlights && postLog.highlights.map((highlight: string, idx: number) => {
                      const parts = highlight.split(": ");
                      if (parts.length > 1) {
                        return (
                          <li key={idx} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-neon-green/30 hover:bg-white/10 transition-colors list-none ml-0 shadow-lg">
                            <strong className="text-neon-green text-base sm:text-lg block mb-2 font-display tracking-wide uppercase">{parts[0]}</strong> 
                            <span className="text-gray-300 leading-relaxed block text-sm sm:text-base">{parts.slice(1).join(": ")}</span>
                          </li>
                        );
                      }
                      return (
                        <li key={idx} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:border-neon-green/30 hover:bg-white/10 transition-colors list-none ml-0 shadow-lg">
                          <span className="text-gray-300 leading-relaxed block text-sm sm:text-base">{highlight}</span>
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
            
            {/* Prev / Next Navigation */}
            {!isMdx && (
              <footer className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-between gap-4 relative z-10">
                {prevLog ? (
                  <Link href={`/blog/${prevLog.version}`} className="flex-1 glass-panel p-4 hover:border-neon-green/50 hover:bg-white/5 transition-all group flex flex-col items-start rounded-lg">
                    <span className="text-[10px] text-gray-500 font-display uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-neon-green transition-colors">
                      &larr; Previous Post
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-gray-300 group-hover:text-white line-clamp-1">v{prevLog.version} - {prevLog.title}</span>
                  </Link>
                ) : <div className="flex-1"></div>}
                
                {nextLog ? (
                  <Link href={`/blog/${nextLog.version}`} className="flex-1 glass-panel p-4 hover:border-neon-green/50 hover:bg-white/5 transition-all group flex flex-col items-end text-right rounded-lg">
                    <span className="text-[10px] text-gray-500 font-display uppercase tracking-widest mb-1 flex items-center gap-1 group-hover:text-neon-green transition-colors">
                      Next Post &rarr;
                    </span>
                    <span className="font-bold text-xs sm:text-sm text-gray-300 group-hover:text-white line-clamp-1">v{nextLog.version} - {nextLog.title}</span>
                  </Link>
                ) : <div className="flex-1"></div>}
              </footer>
            )}
          </article>
        </div>
        
        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-panel p-6 sticky top-24 rounded-xl border border-white/5">
            <h4 className="font-display font-bold text-white border-b border-white/10 pb-3 mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
              <Share2 className="w-4 h-4 text-neon-green" /> Share Post
            </h4>
            <ShareButtons url={postUrl} title={title} />
            
            <h4 className="font-display font-bold text-white border-b border-white/10 pb-3 mb-4 mt-8 text-xs uppercase tracking-widest flex items-center gap-2">
              <Tag className="w-4 h-4 text-neon-green" /> Tags
            </h4>
            <div className="flex flex-wrap gap-2">
              {isMdx && mdxPost.tags && mdxPost.tags.length > 0
                ? mdxPost.tags.map((tag: string) => (
                    <span key={tag} className="bg-white/5 border border-white/10 text-gray-400 px-2 py-1 rounded text-[10px] uppercase font-mono tracking-wider">{tag}</span>
                  ))
                : ["AI Agent", "Optimization", "Telemetry"].map((tag) => (
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
