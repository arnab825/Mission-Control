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
        // Track which headings are in the viewport
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Find the one closest to the top of the viewport
          const topEntry = visibleEntries.reduce((prev, curr) => {
            return curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev;
          });
          if (topEntry.target.id) {
            setActiveId(topEntry.target.id);
          }
        }
      },
      {
        rootMargin: "-80px 0px -60% 0px", // Trigger when heading is near the top half of the screen
        threshold: 0,
      }
    );

    headingElements.forEach((el) => {
      if (el) observer.observe(el);
    });

    // Also run a scroll listener to highlight the first heading if at the very top of the page
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
    <ul className="space-y-2 text-xs font-mono">
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
              className={`transition-all duration-150 leading-relaxed block truncate border-l pl-3 -ml-[1px] ${
                isActive
                  ? "text-neon-green border-neon-green font-bold"
                  : "text-gray-500 hover:text-gray-300 border-white/5"
              }`}
            >
              {h.text}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
