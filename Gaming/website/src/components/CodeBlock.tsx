"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { Check, Copy, Eye, Code } from "lucide-react";
import { MermaidDiagram } from "@/components/MermaidDiagram";

interface CodeBlockProps {
  code: string;
  language: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const isMermaid = language.toLowerCase() === "mermaid";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  if (isMermaid && !showCode) {
    return (
      <div className="relative group/mermaid">
        <div className="flex items-center justify-end gap-3 mb-2 font-mono text-[10px]">
          <button
            onClick={() => setShowCode(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:text-neon-green hover:border-neon-green/40 transition-all cursor-pointer"
          >
            <Code className="w-3 h-3" />
            <span>View Source Definition</span>
          </button>
        </div>
        <MermaidDiagram chart={code} />
      </div>
    );
  }

  const displayLanguage = {
    text: "Console Output",
    plaintext: "Output Log",
    powershell: "PowerShell",
    cpp: "C++",
    python: "Python",
    bash: "Bash / Terminal",
    json: "JSON Config",
  }[language.toLowerCase()] || language;

  return (
    <div className="relative group/code my-6 rounded-xl overflow-hidden border border-white/8 bg-[#0a0a0c] font-sans">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/3 border-b border-white/5 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-300">{displayLanguage}</span>
          {isMermaid && (
            <button
              onClick={() => setShowCode(false)}
              className="flex items-center gap-1 text-neon-green hover:underline cursor-pointer text-[9px] font-bold"
            >
              <Eye className="w-3 h-3" />
              <span>View Visual Diagram</span>
            </button>
          )}
        </div>
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
          language={language === "text" || language === "plaintext" ? "text" : language}
          PreTag="div"
          customStyle={{
            background: "transparent",
            padding: "1.25rem",
            margin: 0,
            fontSize: "0.8rem",
            lineHeight: "1.6",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            whiteSpace: "pre",
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
