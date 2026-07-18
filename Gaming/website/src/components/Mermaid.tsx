"use client";

import { useEffect, useRef, useState } from "react";

interface MermaidProps {
  chart: string;
}

function decodeHTMLEntities(html: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#39;': "'",
    '&apos;': "'"
  };
  return html.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;|&apos;/g, (m) => map[m] || m);
}

function sanitizeMermaidCode(code: string): string {
  let cleaned = code;
  
  // 1. Fix flowchart arrows ending with |text|>
  cleaned = cleaned.replace(/-->\s*\|([^|]+)\|\s*>/g, "-->|$1| ");
  cleaned = cleaned.replace(/-->\s*\|([^|]+)\|>/g, "-->|$1| ");

  // 2. Fix flowchart arrows with spaces inside pipes
  cleaned = cleaned.replace(/-->\s*\|\s+([^|]+?)\s+\|\s+/g, "-->|$1| ");
  cleaned = cleaned.replace(/-->\s*\|\s+([^|]+?)\s+\|/g, "-->|$1| ");

  // 3. Fix unquoted node labels containing spaces/parentheses/brackets by quoting them
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)\]/g, '$1["$2"]');
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)\)/g, '$1("$2")');
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)\}/g, '$1{"$2"}');

  // 4. Fix unclosed brackets/parentheses/braces (e.g., B[Supporting Talent)
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1["$2"]');
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1("$2")');
  cleaned = cleaned.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1{"$2"}');

  // 5. Fix pie chart titles (remove colon)
  cleaned = cleaned.replace(/^\s*title:\s*(.*)$/gm, "    title $1");

  return cleaned;
}

export default function Mermaid({ chart }: MermaidProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Import mermaid dynamically on the client side only to bypass SSR
    const initAndRender = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          themeVariables: {
            background: "transparent",
            primaryColor: "#00f0ff", // neon teal
            primaryTextColor: "#ffffff",
            lineColor: "#00f0ff",
            secondaryColor: "#7000ff", // neon purple
            tertiaryColor: "#0d0d0d",
          }
        });

        // Generate a random ID for the SVG
        const id = `mermaid-${Math.floor(Math.random() * 1000000)}`;
        const cleanChart = sanitizeMermaidCode(decodeHTMLEntities(chart.trim()));
        const { svg: renderedSvg } = await mermaid.render(id, cleanChart);
        
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: unknown) {
        console.error("Mermaid parsing error:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to parse Mermaid diagram");
        }
      }
    };

    initAndRender();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (error) {
    return (
      <div className="p-4 bg-red-950/20 border border-red-500/30 text-red-400 rounded-lg font-mono text-xs my-6">
        <p className="font-bold mb-1">Mermaid Render Error:</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  return (
    <div 
      ref={ref} 
      className="flex justify-center my-10 p-6 rounded-lg border border-neon-green/15 bg-black/40 backdrop-blur-sm overflow-x-auto w-full max-w-3xl mx-auto shadow-[0_0_30px_rgba(118, 185, 0,0.03)]"
      dangerouslySetInnerHTML={{ 
        __html: svg || '<div class="animate-pulse text-neon-green/60 font-mono text-xs">Generating layout architecture...</div>' 
      }}
    />
  );
}
