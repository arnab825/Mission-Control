import { getDocBySlug, getAllDocs } from "@/lib/docs";
import { notFound } from "next/navigation";
import Script from "next/script";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export async function generateStaticParams() {
  const docs = getAllDocs();
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  const doc = getDocBySlug(resolvedParams.slug);

  if (!doc) {
    notFound();
  }

  const docsSchema = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": doc.title,
    "description": doc.excerpt,
  };

  return (
    <>
      <Script id="docs-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(docsSchema) }} />
      <div className="mb-12">
        <p className="text-neon-green font-display tracking-wider uppercase text-sm mb-2">{doc.category || "Documentation"}</p>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white mb-4">{doc.title}</h1>
      </div>

      <div className="prose prose-invert prose-headings:font-display prose-a:text-neon-green max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {doc.content}
        </ReactMarkdown>
      </div>
    </>
  );
}

