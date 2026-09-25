"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`fixed bottom-5 sm:bottom-6 right-18 sm:right-22 z-40 p-2.5 sm:p-3 bg-obsidian/90 backdrop-blur-md border border-neon-green/30 text-neon-green rounded-full shadow-[0_0_15px_rgba(118,185,0,0.2)] hover:shadow-[0_0_20px_rgba(118,185,0,0.4)] hover:bg-neon-green hover:text-obsidian hover:border-neon-green transition-all duration-300 transform cursor-pointer touch-manipulation active:scale-95 ${
        isVisible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-75 translate-y-4 pointer-events-none"
      }`}
      aria-label="Scroll to top"
    >
      <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5" />
    </button>
  );
}
