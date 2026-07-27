"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    if (headings.length === 0) return;

    const headingElements = headings.map((h) => document.getElementById(h.id)).filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          const topEntry = visibleEntries.reduce((prev, curr) => {
            return curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev;
          });
          if (topEntry.target.id) {
            setActiveId(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px",
        threshold: 0,
      }
    );

    headingElements.forEach((el) => {
      if (el) observer.observe(el);
    });

    const handleScroll = () => {
      if (window.scrollY < 100 && headings.length > 0) {
        setActiveId(headings[0].id);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
    };
  }, [headings]);

  return (
    <nav className="font-sans">
      <ul className="space-y-1 text-xs">
        {headings.map((h, idx) => {
          const isActive = activeId === h.id;
          return (
            <li
              key={`${h.id}-${idx}`}
              style={{ paddingLeft: h.level === 3 ? "12px" : "0px" }}
              className="relative"
            >
              <a
                href={`#${h.id}`}
                className={`transition-all duration-150 py-1 pl-3.5 border-l-2 block truncate ${
                  isActive
                    ? "text-neon-green border-neon-green font-bold bg-neon-green/10 rounded-r-md shadow-[0_0_10px_rgba(34,197,94,0.1)]"
                    : "text-gray-400 hover:text-white border-white/10 hover:border-white/30"
                }`}
              >
                {h.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
