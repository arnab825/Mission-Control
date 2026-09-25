"use client";

import { useEffect, useState, useRef } from "react";
import { ChevronRight, CornerDownRight } from "lucide-react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  headings: Heading[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    if (headings.length === 0) return;

    const handleScroll = () => {
      const scrollPosition = window.scrollY;

      // At top of page, default to first heading
      if (scrollPosition < 80) {
        setActiveId(headings[0].id);
        return;
      }

      // Find the last heading whose top position is <= 140px (just below top navbar)
      let currentActiveId = headings[0].id;
      for (const h of headings) {
        const el = document.getElementById(h.id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top <= 140) {
            currentActiveId = h.id;
          } else {
            break;
          }
        }
      }
      setActiveId(currentActiveId);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  // Auto-scroll active outline item into view inside sidebar container
  useEffect(() => {
    if (!activeId) return;
    const activeEl = itemRefs.current[activeId];
    if (activeEl) {
      activeEl.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "smooth"
      });
    }
  }, [activeId]);

  return (
    <nav className="font-sans">
      <ul className="space-y-1 text-xs">
        {headings.map((h, idx) => {
          const isActive = activeId === h.id;
          return (
            <li
              key={`${h.id}-${idx}`}
              style={{ paddingLeft: h.level === 3 ? "10px" : "0px" }}
              className="relative"
            >
              <a
                ref={(el) => { itemRefs.current[h.id] = el; }}
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const targetEl = document.getElementById(h.id);
                  if (targetEl) {
                    const top = targetEl.getBoundingClientRect().top + window.scrollY - 100;
                    window.scrollTo({ top, behavior: "smooth" });
                    setActiveId(h.id);
                  }
                }}
                className={`transition-all duration-150 py-1.5 px-2.5 border-l-2 flex items-center gap-2 truncate rounded-r-lg group cursor-pointer ${
                  isActive
                    ? "text-neon-green border-neon-green font-bold bg-neon-green/10 shadow-[0_0_12px_rgba(34,197,94,0.15)]"
                    : "text-gray-400 hover:text-white border-white/10 hover:border-white/30 hover:bg-white/[0.03]"
                }`}
              >
                {h.level === 3 ? (
                  <CornerDownRight className={`w-3 h-3 shrink-0 transition-colors ${
                    isActive ? "text-neon-green animate-pulse" : "text-gray-600 group-hover:text-neon-green"
                  }`} />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition-transform duration-150 ${
                    isActive ? "text-neon-green translate-x-0.5" : "text-gray-500 group-hover:text-neon-green"
                  }`} />
                )}
                <span className="truncate">{h.text}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
