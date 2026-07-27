import { getDocBySlug, getAllDocs } from "@/lib/docs";
import { notFound } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import React from "react";
import { ChevronLeft, ChevronRight, BookOpen, Clock, Tag, Share2, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { TableOfContents } from "@/components/TableOfContents";
import { CodeBlock } from "@/components/CodeBlock";

export async function generateStaticParams() {
  const docs = await getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

function getChildrenText(children: any): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(getChildrenText).join('');
  if (React.isValidElement(children)) return getChildrenText((children.props as any).children);
  return '';
}

function removeAlertPrefix(children: any): any {
  if (typeof children === 'string') {
    return children
      .replace(/\[!NOTE\]/gi, "")
      .replace(/\[!IMPORTANT\]/gi, "")
      .replace(/\[!WARNING\]/gi, "")
      .replace(/\[!TIP\]/gi, "")
      .replace(/\[!CAUTION\]/gi, "")
      .trim();
  }
  if (Array.isArray(children)) {
    return children.map(removeAlertPrefix);
  }
  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<any>;
    return React.cloneElement(
      element,
      element.props,
      removeAlertPrefix(element.props.children)
    );
  }
  return children;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractHeadings(content: string): { id: string; text: string; level: number }[] {
  const headingRegex = /^##\s+(.*)/gm;
  const headings: { id: string; text: string; level: number }[] = [];
  let match;
  headingRegex.lastIndex = 0;
  while ((match = headingRegex.exec(content)) !== null) {
    const level = 2;
    const rawText = match[1].trim();
    const text = rawText
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_`]/g, "");
    const id = slugify(text);
    headings.push({ id, text, level });
  }
  return headings;
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const doc = await getDocBySlug(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  const allDocuments = await getAllDocs();
  const currentIndex = allDocuments.findIndex((d) => d.slug === resolvedParams.slug);
  const prevDoc = currentIndex > 0 ? allDocuments[currentIndex - 1] : null;
  const nextDoc = currentIndex < allDocuments.length - 1 ? allDocuments[currentIndex + 1] : null;

  const headings = extractHeadings(doc.content);

  // Calculate estimated reading time
  const words = (doc.content || "").split(/\s+/).length;
  const readTimeMinutes = Math.max(1, Math.ceil(words / 180));

  const docsSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": doc.title,
    "description": doc.excerpt,
  };

  return (
    <div className="flex items-start gap-10 w-full relative font-sans">
      <div className="flex-1 min-w-0 max-w-4xl">
        <Script id="docs-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(docsSchema) }} />
        
        {/* Breadcrumbs Navigation */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-6 flex-wrap bg-[#0c0d12]/60 border border-white/5 px-4 py-2 rounded-xl backdrop-blur-sm w-fit">
          <Link href="/docs" className="hover:text-neon-green transition-colors flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-neon-green" />
            <span>Docs</span>
          </Link>
          <span className="text-gray-700 select-none">/</span>
          <span className="text-gray-400 select-none">{doc.category || "Documentation"}</span>
          <span className="text-gray-700 select-none">/</span>
          <span className="text-neon-green font-bold truncate max-w-[200px]">{doc.title}</span>
        </div>

        {/* Article Hero Banner */}
        <div className="mb-10 pb-8 border-b border-white/10 relative">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-neon-green bg-neon-green/10 border border-neon-green/30 rounded-full px-3 py-0.5">
              {doc.category || "General"}
            </span>
            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-neon-green" />
              {readTimeMinutes} min read
            </span>
            {doc.badge && (
              <span className="text-[10px] font-mono font-bold text-neon-yellow bg-neon-yellow/10 border border-neon-yellow/30 rounded-full px-2.5 py-0.5 uppercase tracking-wider">
                {doc.badge}
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4 font-display leading-tight">
            {doc.title}
          </h1>

          {doc.excerpt && (
            <p className="text-base text-gray-400 leading-relaxed font-mono border-l-2 border-neon-green/50 pl-4 py-1 bg-neon-green/[0.02]">
              {doc.excerpt}
            </p>
          )}
        </div>

        {/* Article Body Content */}
        <div className="prose prose-invert prose-headings:font-display prose-headings:text-white prose-a:text-neon-green prose-a:no-underline hover:prose-a:underline prose-code:font-mono prose-code:text-neon-yellow max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }: any) => (
                <div className="my-4 text-gray-300 leading-relaxed font-sans">{children}</div>
              ),
              table: ({ children, ...props }: any) => (
                <div className="overflow-x-auto my-8 border border-white/10 rounded-2xl bg-[#0c0d12] w-full shadow-xl">
                  <table className="w-full border-collapse text-left m-0" {...props}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children, ...props }: any) => (
                <th className="bg-white/5 py-3 px-4 font-mono font-bold text-xs uppercase tracking-wider text-neon-green border-b border-white/10" {...props}>
                  {children}
                </th>
              ),
              li: ({ children, ...props }: any) => {
                const text = getChildrenText(children);
                const isChecked = /^\[[xX]\]/.test(text.trim());
                const isUnchecked = /^\[\s\]/.test(text.trim());

                if (isChecked || isUnchecked) {
                  const cleanedChildren = React.Children.map(children, (child) => {
                    if (typeof child === 'string') {
                      return child.replace(/^\[[xX\s]\]\s*/, '');
                    }
                    return child;
                  });

                  return (
                    <li className="list-none flex items-start gap-2.5 my-2 text-gray-300 font-sans" {...props}>
                      {isChecked ? (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-neon-green/20 border border-neon-green text-neon-green text-[10px] font-bold shrink-0 mt-1 shadow-[0_0_8px_rgba(118,185,0,0.4)]">
                          ✓
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-4 h-4 rounded bg-white/5 border border-white/20 shrink-0 mt-1" />
                      )}
                      <div>{cleanedChildren}</div>
                    </li>
                  );
                }

                return <li className="my-1.5 text-gray-300 font-sans" {...props}>{children}</li>;
              },
              td: ({ children, ...props }: any) => (
                <td className="py-3 px-4 text-xs text-gray-300 font-sans border-b border-white/5" {...props}>
                  {children}
                </td>
              ),
              h2: ({ children, ...props }) => {
                const text = getChildrenText(children);
                const id = slugify(text);
                return (
                  <h2 id={id} className="scroll-mt-24 text-2xl font-bold font-display text-white mt-10 mb-4 pb-2 border-b border-white/10" {...props}>
                    {children}
                  </h2>
                );
              },
              h3: ({ children, ...props }) => {
                const text = getChildrenText(children);
                const id = slugify(text);
                return (
                  <h3 id={id} className="scroll-mt-24 text-lg font-bold font-display text-white mt-6 mb-3 text-neon-green/90" {...props}>
                    {children}
                  </h3>
                );
              },
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                const contentStr = String(children).replace(/\n$/, '');
                const isMultiLine = contentStr.includes('\n');
                
                if (isMultiLine || match) {
                  return (
                    <CodeBlock
                      code={contentStr}
                      language={match ? match[1] : 'text'}
                    />
                  );
                }
                
                return (
                  <code className="bg-white/10 border border-white/15 px-2 py-0.5 rounded text-xs font-mono text-neon-green font-semibold" {...props}>
                    {children}
                  </code>
                );
              },
              blockquote: ({ children, ...props }) => {
                const text = getChildrenText(children);
                let type: "note" | "important" | "warning" | "tip" | "caution" | null = null;
                
                if (/\[!NOTE\]/i.test(text)) type = "note";
                else if (/\[!IMPORTANT\]/i.test(text)) type = "important";
                else if (/\[!WARNING\]/i.test(text)) type = "warning";
                else if (/\[!TIP\]/i.test(text)) type = "tip";
                else if (/\[!CAUTION\]/i.test(text)) type = "caution";
                
                if (!type) {
                  return (
                    <blockquote className="border-l-4 border-neon-green bg-[#0d0e12] py-4 px-5 my-6 rounded-r-2xl text-gray-300 shadow-md font-mono text-xs" {...props}>
                      {children}
                    </blockquote>
                  );
                }
                
                const styles = {
                  note: { border: "border-l-4 border-blue-500", bg: "bg-blue-950/20 text-blue-200 border-blue-500/30", label: "Note", icon: "ℹ️" },
                  important: { border: "border-l-4 border-neon-green", bg: "bg-neon-green/10 text-gray-200 border-neon-green/30", label: "Important", icon: "⚠️" },
                  warning: { border: "border-l-4 border-neon-yellow", bg: "bg-amber-950/20 text-amber-200 border-amber-500/30", label: "Warning", icon: "🚨" },
                  tip: { border: "border-l-4 border-emerald-500", bg: "bg-emerald-950/20 text-emerald-200 border-emerald-500/30", label: "Tip", icon: "💡" },
                  caution: { border: "border-l-4 border-red-500", bg: "bg-red-950/20 text-red-200 border-red-500/30", label: "Caution", icon: "🔥" }
                }[type];
                
                const cleanedChildren = removeAlertPrefix(children);
                
                return (
                  <div className={`p-5 my-6 rounded-r-2xl border ${styles.border} ${styles.bg} backdrop-blur-md shadow-lg`}>
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest font-bold text-white">
                      <span className="text-sm">{styles.icon}</span>
                      <span>{styles.label}</span>
                    </div>
                    <div className="text-xs leading-relaxed font-sans text-gray-300">
                      {cleanedChildren}
                    </div>
                  </div>
                );
              }
            }}
          >
            {doc.content}
          </ReactMarkdown>
        </div>

        {/* Previous / Next Article Pagination Cards */}
        {(prevDoc || nextDoc) && (
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4 items-stretch justify-between font-mono">
            {prevDoc ? (
              <Link
                href={`/docs/${prevDoc.slug}`}
                className="flex-1 flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-[#0c0d12] hover:bg-[#12141c] hover:border-neon-green/40 transition-all duration-200 group text-left shadow-lg"
              >
                <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-black transition-all shrink-0 mt-0.5">
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Previous Article</span>
                  <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors block truncate">{prevDoc.title}</span>
                </div>
              </Link>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}

            {nextDoc ? (
              <Link
                href={`/docs/${nextDoc.slug}`}
                className="flex-1 flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/10 bg-[#0c0d12] hover:bg-[#12141c] hover:border-neon-green/40 transition-all duration-200 group text-right shadow-lg"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Next Article</span>
                  <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors block truncate">{nextDoc.title}</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-neon-green/10 border border-neon-green/20 flex items-center justify-center text-neon-green group-hover:bg-neon-green group-hover:text-black transition-all shrink-0 mt-0.5">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Index / Table of Contents */}
      {headings.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto pl-6 border-l border-white/10 scrollbar-none">
          <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-neon-green uppercase tracking-widest mb-4 pb-2 border-b border-white/5">
            <Sparkles className="w-3 h-3 text-neon-green" />
            <span>On This Page</span>
          </div>
          <TableOfContents headings={headings} />
        </aside>
      )}
    </div>
  );
}
