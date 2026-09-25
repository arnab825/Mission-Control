"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Terminal, ChevronRight, BookOpen, Layers, FileCode2, Cpu, Bot, Zap, 
  History, Sparkles, FileText, Activity, ShieldCheck, Flame, Compass, 
  GitBranch, Code2, Users
} from "lucide-react";
import { DocData } from "@/lib/docs";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORY_ICONS: Record<string, any> = {
  "Overview": BookOpen,
  "Architecture": Cpu,
  "Core Logic": Bot,
  "Integrations": Zap,
  "AI Models": ShieldCheck,
  "Performance": Flame,
  "Roadmaps": Compass,
  "Reference": Terminal,
  "Documentation": Layers,
};

const DOC_ITEM_ICONS: Record<string, any> = {
  "summary": FileText,
  "changes_summary": History,
  "design": Cpu,
  "process": Activity,
  "agentic_logic": Bot,
  "agents": Users,
  "nvidia_ai_guide": Zap,
  "nvidia": Zap,
  "on_demand_ai_weights": ShieldCheck,
  "fps": Flame,
  "productroadmap": Compass,
  "electronroadmap": GitBranch,
  "aero_ai_full_prompt": Code2,
  "patchesfile": Layers,
};

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

  const getCategoryIcon = (category: string) => {
    const IconComponent = CATEGORY_ICONS[category] || Layers;
    return <IconComponent className="w-3.5 h-3.5 text-neon-green shrink-0" />;
  };

  const getDocIcon = (slug: string) => {
    const IconComponent = DOC_ITEM_ICONS[slug] || FileCode2;
    return IconComponent;
  };

  return (
    <nav className="space-y-4 flex-1 flex flex-col h-full font-sans">
      <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 scrollbar-none">
        {categoryList.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs font-mono">
            No documentation sections available
          </div>
        ) : (
          categoryList.map(({ category, items }) => {
            const isExpanded = expandedCategories[category] !== false; // Default true
            const hasActiveItem = items.some(item => pathname === `/docs/${item.slug}`);
            
            return (
              <div key={category} className="space-y-1">
                <button
                  onClick={() => toggleCategory(category)}
                  className="w-full flex items-center justify-between gap-2 py-1.5 px-2 rounded-lg group/cat hover:bg-white/[0.04] transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`p-1 rounded-md transition-colors duration-150 ${
                      hasActiveItem 
                        ? 'bg-neon-green/15 text-neon-green border border-neon-green/30' 
                        : 'bg-white/5 text-gray-400 group-hover/cat:text-neon-green'
                    }`}>
                      {getCategoryIcon(category)}
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
                        const DocIcon = getDocIcon(doc.slug);
                        
                        return (
                          <li key={doc.slug}>
                            <Link
                              href={`/docs/${doc.slug}`}
                              className={`flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg transition-all duration-150 relative group ${
                                isActive 
                                  ? 'text-white font-bold bg-gradient-to-r from-neon-green/20 to-transparent border-l-2 border-neon-green shadow-[0_0_12px_rgba(34,197,94,0.15)]' 
                                  : 'text-gray-400 hover:text-white hover:bg-white/5'
                              }`}
                            >
                              <DocIcon className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                                isActive ? 'text-neon-green' : 'text-gray-500 group-hover:text-neon-green'
                              }`} />
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
