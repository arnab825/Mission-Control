"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Terminal, Search, ChevronRight, BookOpen, Layers, FileCode2, Cpu, Bot, Zap } from "lucide-react";
import { DocData } from "@/lib/docs";
import { motion, AnimatePresence } from "framer-motion";

export function DocsSidebarNav({ docs }: { docs: DocData[] }) {
  const [query, setQuery] = useState("");
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

  const filteredCategories = useMemo(() => {
    if (!query.trim()) {
      return Object.entries(categoriesMap).map(([category, items]) => ({
        category,
        items
      }));
    }
    
    const q = query.toLowerCase();
    const result = [];
    
    for (const [category, items] of Object.entries(categoriesMap)) {
      const filteredItems = items.filter(item => 
        item.title.toLowerCase().includes(q) || 
        category.toLowerCase().includes(q)
      );
      
      if (filteredItems.length > 0) {
        result.push({ category, items: filteredItems });
      }
    }
    
    return result;
  }, [query, categoriesMap]);

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
    <nav className="space-y-6 flex-1 flex flex-col h-full font-sans">
      {/* Search Bar */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search docs..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#121216] border border-white/5 text-[13px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-neon-green/40 focus:ring-1 focus:ring-neon-green/40 transition-all shadow-inner"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors text-[10px] font-medium uppercase tracking-wider"
          >
            Clear
          </button>
        )}
      </div>

      <div className="space-y-8 flex-1 overflow-y-auto pr-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No results found
          </div>
        ) : (
          filteredCategories.map(({ category, items }, idx) => {
            const isExpanded = expandedCategories[category] !== false; // Default true
            
            return (
              <div key={category} className="animate-in fade-in slide-in-from-bottom-2">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between gap-2 mb-3 group/cat"
                >
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-white/5 text-gray-400 group-hover/cat:text-neon-green transition-colors">
                      {getIconForIndex(idx)}
                    </div>
                    <h3 className="font-semibold text-gray-400 text-[11px] tracking-[0.2em] uppercase truncate group-hover/cat:text-gray-200 transition-colors">
                      {category}
                    </h3>
                  </div>
                  <ChevronRight 
                    className={`w-3.5 h-3.5 text-gray-600 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                </button>
                
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="space-y-0.5 overflow-hidden border-l border-white/5 ml-3 pl-2"
                    >
                      {items.map((doc) => {
                        const isActive = pathname === `/docs/${doc.slug}`;
                        
                        return (
                          <li key={doc.slug}>
                            <Link
                              href={`/docs/${doc.slug}`}
                              className={`flex items-center text-[13px] py-2 px-3 rounded-r-lg transition-all duration-300 relative group overflow-hidden ${
                                isActive 
                                  ? 'text-white font-bold bg-gradient-to-r from-neon-green/20 to-transparent' 
                                  : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                              }`}
                            >
                              {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-neon-green rounded-full shadow-[0_0_12px_rgba(0,255,0,1)]" />
                              )}
                              <span className={`truncate tracking-wide relative z-10 transition-all duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : ''}`}>{doc.title}</span>
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
