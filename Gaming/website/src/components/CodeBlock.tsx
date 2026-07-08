"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Check, Copy } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  return (
    <div className="relative group/code my-6 rounded-xl overflow-hidden border border-white/8 bg-[#0a0a0c] font-sans">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/3 border-b border-white/5 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-neon-green transition-colors cursor-pointer select-none font-bold uppercase tracking-wider text-[9px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-neon-green" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-500 group-hover/code:text-neon-green transition-colors" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Body */}
      <div className="overflow-x-auto">
        <SyntaxHighlighter
          style={atomDark}
          language={language}
          PreTag="div"
          customStyle={{
            background: "transparent",
            padding: "1.25rem",
            margin: 0,
            fontSize: "0.8rem",
            lineHeight: "1.5",
            fontFamily: "var(--font-jetbrains-mono)",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
