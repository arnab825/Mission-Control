import Link from "next/link";
import { BookOpen, Terminal, Sparkles, ChevronLeft } from "lucide-react";
import { getAllDocs } from "@/lib/docs";
import { DocsSidebarNav } from "@/components/DocsSidebarNav";
import { DocsVersionBadge } from "@/components/DocsVersionBadge";
import MobileDocsSidebar from "@/components/MobileDocsSidebar";

export default async function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const docs = await getAllDocs();

  return (
    <div className="flex-1 w-full relative pt-20 bg-[#070709] text-gray-300 flex flex-col min-h-screen overflow-x-clip">

      {/* Ambient background glows */}
      <div className="absolute top-20 left-10 w-72 sm:w-[500px] h-72 sm:h-[500px] bg-neon-green/5 blur-[120px] sm:blur-[180px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-72 sm:w-[400px] h-72 sm:h-[400px] bg-emerald-500/3 blur-[120px] sm:blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* Mobile Sidebar Navigation */}
      <MobileDocsSidebar docs={docs} />

      <div className="max-w-[90rem] mx-auto px-4 sm:px-6 md:px-8 flex-1 flex items-start w-full gap-8">

        {/* ── Left Sidebar ─────────────────────────────────────────────── */}
        <aside className="sticky top-24 hidden lg:flex flex-col w-64 pt-2 pb-8 h-[calc(100vh-7rem)] overflow-y-auto border-r border-white/10 pr-4 gap-5 scrollbar-none shrink-0 self-start z-30">

          {/* Navigation Controls */}
          <div className="space-y-2 pb-4 border-b border-white/10">
            <Link
              href="/"
              className="flex items-center gap-2 text-[11px] font-mono font-bold text-gray-400 hover:text-neon-green transition-colors uppercase tracking-widest group px-2 py-1.5 rounded-lg hover:bg-white/5"
            >
              <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform text-neon-green" />
              <span>Mission Control</span>
            </Link>

            <Link
              href="/docs"
              className="flex items-center justify-between text-[11px] font-mono font-bold text-neon-green bg-neon-green/10 border border-neon-green/20 px-3 py-2 rounded-xl uppercase tracking-wider hover:bg-neon-green/15 transition-all shadow-[0_0_15px_rgba(34,197,94,0.1)]"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Docs Home</span>
              </div>
              <Sparkles className="w-3 h-3 opacity-70" />
            </Link>
          </div>

          {/* Searchable and categorized navigation component */}
          <div className="flex-1 min-h-0">
            <DocsSidebarNav docs={docs} />
          </div>

          {/* Dynamic Version badge */}
          <DocsVersionBadge />
        </aside>

        {/* ── Main Content ─────────────────────────────────────────────── */}
        <main className="w-full pt-4 pb-16 pr-0 xl:pr-4 min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
