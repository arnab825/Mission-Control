"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
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
    c: "C",
    python: "Python",
    bash: "Bash / Terminal",
    json: "JSON Config",
    typescript: "TypeScript",
    javascript: "JavaScript",
  }[language.toLowerCase()] || language.toUpperCase();

  return (
    <div className="relative group/code my-6 rounded-2xl overflow-hidden border border-white/10 bg-[#08090c] font-sans shadow-xl">
      {/* Code Block Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/5 text-[11px] font-mono text-gray-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neon-green/80 inline-block" />
          <span className="font-bold text-gray-200">{displayLanguage}</span>
          {isMermaid && (
            <button
              onClick={() => setShowCode(false)}
              className="flex items-center gap-1 text-neon-green hover:underline cursor-pointer text-[10px] font-bold ml-2"
            >
              <Eye className="w-3 h-3" />
              <span>View Visual Diagram</span>
            </button>
          )}
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-300 hover:text-neon-green transition-colors cursor-pointer select-none font-mono text-[10px]"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-neon-green" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 text-gray-400 group-hover/code:text-neon-green transition-colors" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      
      {/* Code Body with clean typography & zero text-shadow/blur */}
      <div className="overflow-x-auto p-4 sm:p-5 text-[13px] font-mono leading-relaxed [&_span]:!shadow-none [&_span]:!text-shadow-none [&_code]:!bg-transparent [&_code]:!border-none [&_code]:!p-0 [&_code]:!shadow-none">
        <SyntaxHighlighter
          style={oneDark}
          language={language === "text" || language === "plaintext" ? "text" : language}
          PreTag="div"
          customStyle={{
            background: "transparent",
            padding: 0,
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.7",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
            textShadow: "none",
            boxShadow: "none",
          }}
          codeTagProps={{
            style: {
              background: "transparent",
              textShadow: "none",
              boxShadow: "none",
              border: "none",
            }
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
