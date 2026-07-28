"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Menu, X, ChevronRight } from "lucide-react";
import { DocData } from "@/lib/docs";
import { DocsSidebarNav } from "@/components/DocsSidebarNav";

export default function MobileDocsSidebar({ docs }: { docs: DocData[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [appVersion, setAppVersion] = useState("2.6.2");
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data?.version) setAppVersion(data.version);
      })
      .catch(() => {});
  }, []);

  // Close the drawer automatically when pathname changes (user clicks a link)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Find current doc title or category for display in the sub-header bar
  const activeDoc = docs.find((d) => `/docs/${d.slug}` === pathname);
  const rawCategory = activeDoc?.category || "Docs";
  const currentCategory = rawCategory === "Documentation" ? "Docs" : rawCategory;
  const currentTitle = activeDoc?.title || "Home";

  return (
    <div className="lg:hidden w-full">
      {/* Sticky Mobile Sub-Header Toggle Bar */}
      <div className="sticky top-20 left-0 right-0 z-30 flex items-center justify-between px-2.5 min-[360px]:px-4 py-2.5 bg-[#0a0a0c]/90 backdrop-blur-md border-b border-white/5 shadow-md gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 text-[10px] min-[360px]:text-xs font-mono font-bold text-neon-green hover:text-white px-2.5 min-[360px]:px-3 py-1.5 rounded-lg bg-neon-green/10 border border-neon-green/20 hover:bg-neon-green/20 transition-all uppercase tracking-wider shrink-0 cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Docs Menu</span>
        </button>

        <div className="flex items-center gap-1 text-[9px] min-[360px]:text-[10px] font-mono text-gray-500 uppercase tracking-widest min-w-0 truncate">
          <span className="truncate">{currentCategory}</span>
          <ChevronRight className="w-2.5 h-2.5 shrink-0 text-gray-700" />
          <span className="text-gray-300 font-bold truncate">{currentTitle}</span>
        </div>
      </div>

      {/* Slide-over Drawer Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Sidebar Slide Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-[#0d0e12] border-r border-white/10 z-50 flex flex-col p-5 sm:p-6 shadow-2xl h-screen"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/5 mb-5">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neon-green" />
                  <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                    Docs Navigation
                  </span>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
                  aria-label="Close Docs Navigation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Categorized Docs Links inside Drawer */}
              <div className="flex-1 overflow-y-auto pb-8 pr-1">
                <DocsSidebarNav docs={docs} />
              </div>

              {/* Version Footer */}
              <div className="border-t border-white/10 pt-4 mt-auto">
                <div className="flex items-center justify-between px-1 text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_rgba(118,185,0,0.8)]" />
                    <span>v{appVersion} Release</span>
                  </div>
                  <span className="text-neon-green font-bold">Stable</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
