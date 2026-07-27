"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, ChevronRight, BookOpen, Layers, FileCode2, Cpu, Bot, Zap } from "lucide-react";
import { DocData } from "@/lib/docs";
import { motion, AnimatePresence } from "framer-motion";

export function DocsSidebarNav({ docs }: { docs: DocData[] }) {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const pathname = usePathname();

  const categoriesMap = useMemo(() => {
    const map: Record<string, DocData[]> = {};
    docs.forEach(doc => {
      const cat = doc.category || "General";
      if (!map[cat]) map[cat] = [];
      map[cat].push(doc);
    });
    return map;
  }, [docs]);

  const categoryList = useMemo(() => {
    return Object.entries(categoriesMap).map(([category, items]) => ({
      category,
      items
    }));
  }, [categoriesMap]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: prev[category] === undefined ? false : !prev[category]
    }));
  };

  const icons = [Terminal, Layers, FileCode2, Cpu, Bot, Zap, BookOpen];
  
  const getIconForIndex = (index: number) => {
    const Icon = icons[index % icons.length];
    return <Icon className="w-3.5 h-3.5 text-neon-green shrink-0" />;
  };

  return (
    <nav className="space-y-4 flex-1 flex flex-col h-full font-sans">
      <div className="space-y-4 flex-1 overflow-y-auto pr-1 scrollbar-none">
        {categoryList.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs font-mono">
            No documentation sections available
          </div>
        ) : (
          categoryList.map(({ category, items }, idx) => {
            const isExpanded = expandedCategories[category] !== false; // Default true
            const hasActiveItem = items.some(item => pathname === `/docs/${item.slug}`);
            
            return (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg group/cat hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md transition-colors duration-150 ${
                      hasActiveItem 
                        ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' 
                        : 'bg-white/5 text-gray-400 group-hover/cat:text-neon-green'
                    }`}>
                      {getIconForIndex(idx)}
                    </div>
                    <h3 className={`font-mono text-[11px] tracking-[0.15em] uppercase truncate transition-colors duration-150 ${
                      hasActiveItem 
                        ? 'text-white font-bold' 
                        : 'text-gray-400 group-hover/cat:text-gray-200 font-semibold'
                    }`}>
                      {category}
                    </h3>
                  </div>
                  <ChevronRight 
                    className={`w-3.5 h-3.5 transition-transform duration-150 ${
                      hasActiveItem ? 'text-neon-green' : 'text-gray-600 group-hover/cat:text-gray-400'
                    } ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15, ease: "easeInOut" }}
                      className="space-y-0.5 border-l border-white/10 ml-3.5 pl-2.5 overflow-hidden"
                    >
                      {items.map((doc) => {
                        const isActive = pathname === `/docs/${doc.slug}`;
                        
                        return (
                          <li key={doc.slug}>
                            <Link
                              href={`/docs/${doc.slug}`}
                              className={`flex items-center text-xs py-1.5 px-2.5 rounded-lg transition-all duration-150 relative group ${
                                isActive 
                                  ? 'text-white font-bold bg-gradient-to-r from-neon-green/20 to-transparent border-l-2 border-neon-green shadow-[0_0_12px_rgba(34,197,94,0.15)]' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <span className={`truncate tracking-wide relative z-10 font-sans ${isActive ? 'text-neon-green' : ''}`}>
                                {doc.title}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </nav>
  );
}
