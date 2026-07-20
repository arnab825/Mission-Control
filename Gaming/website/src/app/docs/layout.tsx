import Link from "next/link";
import { BookOpen, Terminal } from "lucide-react";
import { getAllDocs } from "@/lib/docs";
import { DocsSidebarNav } from "@/components/DocsSidebarNav";
import MobileDocsSidebar from "@/components/MobileDocsSidebar";

// ─── Static sidebar manifest (fallback when Sanity has no content) ────────────

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const docs = await getAllDocs();

  const hasSanityContent = docs.length > 0;

  return (
    <div className="flex-1 w-full relative pt-20 bg-[#0a0a0c] text-gray-300 flex flex-col overflow-x-hidden">

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-neon-green/4 blur-[180px] rounded-full pointer-events-none -z-10" />

      {/* Mobile Sidebar Navigation */}
      <MobileDocsSidebar docs={docs} />

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 flex-1 flex items-start w-full gap-8">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="sticky top-28 hidden lg:flex flex-col w-64 pt-8 pb-10 h-[calc(100vh-7rem)] overflow-y-auto border-r border-white/8 pr-4 gap-6 scrollbar-thin shrink-0">

          {/* Back link */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 hover:text-neon-green transition-colors uppercase tracking-wider group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Mission Control
          </Link>

          {/* Docs overview link */}
          <Link
            href="/docs"
            className="flex items-center gap-2 text-xs font-mono font-bold text-neon-green/80 hover:text-neon-green transition-colors uppercase tracking-wider pb-4 border-b border-white/5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Documentation Home
          </Link>

          {/* Searchable and categorized navigation component */}
          <DocsSidebarNav docs={docs} />

          {/* Version badge */}
          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-gray-600 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse" />
              Production · v1.4.8
            </div>
          </div>
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <main className="w-full pt-6 pb-10 pr-0 xl:pr-4 min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
