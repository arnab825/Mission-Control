import { getDocBySlug, getAllDocs } from "@/lib/docs";
import { notFound } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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

  const docsSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": doc.title,
    "description": doc.excerpt,
  };

  return (
    <div className="flex items-start gap-12 w-full relative">
      <div className="flex-1 min-w-0 max-w-3xl">
        <Script id="docs-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(docsSchema) }} />
        
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-4">
          <Link href="/docs" className="hover:text-neon-green transition-colors">Docs</Link>
          <span className="text-gray-700 select-none">/</span>
          <span className="text-gray-400 select-none">{doc.category || "Documentation"}</span>
          <span className="text-gray-700 select-none">/</span>
          <span className="text-neon-green select-none font-bold">{doc.title}</span>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">{doc.title}</h1>
        </div>

        <div className="prose prose-invert prose-headings:font-display prose-a:text-neon-green max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              table: ({ children, ...props }: any) => (
                <div className="overflow-x-auto my-6 border border-white/5 rounded-xl bg-white/[0.01] w-full">
                  <table className="w-full border-collapse text-left m-0" {...props}>
                    {children}
                  </table>
                </div>
              ),
              h2: ({ children, ...props }) => {
                const text = getChildrenText(children);
                const id = slugify(text);
                return <h2 id={id} className="scroll-mt-24" {...props}>{children}</h2>;
              },
              h3: ({ children, ...props }) => {
                const text = getChildrenText(children);
                const id = slugify(text);
                return <h3 id={id} className="scroll-mt-24" {...props}>{children}</h3>;
              },
              code: ({ node, inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <CodeBlock
                    code={String(children).replace(/\n$/, '')}
                    language={match[1]}
                  />
                ) : (
                  <code className={className} {...props}>
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
                    <blockquote className="border-l-4 border-white/10 bg-white/[0.02] py-4 px-5 my-6 rounded-r-xl text-gray-400" {...props}>
                      {children}
                    </blockquote>
                  );
                }
                
                const styles = {
                  note: { border: "border-l-4 border-blue-500/70", bg: "bg-blue-500/5 text-blue-200/90", label: "Note", icon: "ℹ️" },
                  important: { border: "border-l-4 border-neon-green/70", bg: "bg-neon-green/4 text-gray-200", label: "Important", icon: "⚠️" },
                  warning: { border: "border-l-4 border-neon-yellow/70", bg: "bg-neon-yellow/4 text-gray-200", label: "Warning", icon: "🚨" },
                  tip: { border: "border-l-4 border-emerald-500/70", bg: "bg-emerald-500/5 text-emerald-200/90", label: "Tip", icon: "💡" },
                  caution: { border: "border-l-4 border-red-500/70", bg: "bg-red-500/5 text-red-200/90", label: "Caution", icon: "🔥" }
                }[type];
                
                const cleanedChildren = removeAlertPrefix(children);
                
                return (
                  <div className={`p-5 my-6 rounded-r-xl border-t border-b border-r border-white/5 ${styles.border} ${styles.bg}`}>
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] uppercase tracking-widest font-bold text-white/80">
                      <span className="text-[11px]">{styles.icon}</span>
                      <span>{styles.label}</span>
                    </div>
                    <div className="text-sm leading-relaxed text-gray-300">
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

        {/* Pagination Footer */}
        {(prevDoc || nextDoc) && (
          <div className="mt-16 pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4 items-stretch justify-between font-mono">
            {prevDoc ? (
              <Link
                href={`/docs/${prevDoc.slug}`}
                className="flex-1 flex items-start gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-neon-green/30 transition-all duration-150 group text-left"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500 group-hover:text-neon-green group-hover:-translate-x-1 transition-all shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Previous</span>
                  <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors block truncate">{prevDoc.title}</span>
                </div>
              </Link>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}

            {nextDoc ? (
              <Link
                href={`/docs/${nextDoc.slug}`}
                className="flex-1 flex items-center justify-between gap-4 p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-neon-green/30 transition-all duration-150 group text-right"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold block mb-1">Next</span>
                  <span className="text-sm font-bold text-white group-hover:text-neon-green transition-colors block truncate">{nextDoc.title}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-neon-green group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
              </Link>
            ) : (
              <div className="flex-1 hidden sm:block" />
            )}
          </div>
        )}
      </div>

      {/* Right Sidebar - Index / Table of Contents */}
      {headings.length > 0 && (
        <aside className="hidden xl:block w-64 shrink-0 sticky top-28 h-[calc(100vh-10rem)] overflow-y-auto pl-6 border-l border-white/5 scrollbar-thin">
          <p className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mb-4">On this page</p>
          <TableOfContents headings={headings} />
        </aside>
      )}
    </div>
  );
}

