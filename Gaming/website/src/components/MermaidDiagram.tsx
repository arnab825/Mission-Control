"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsRendering(true);
    setRenderError(null);

    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      fontFamily: "monospace",
      themeVariables: {
        darkMode: true,
        background: "#0a0a0d",
        primaryColor: "#1a2a1d",
        primaryTextColor: "#76b900",
        primaryBorderColor: "#76b900",
        lineColor: "#76b900",
        secondaryColor: "#1f1f2e",
        tertiaryColor: "#0f141d",
      },
    });

    const uniqueId = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;

    mermaid
      .render(uniqueId, chart.trim())
      .then((res) => {
        if (isMounted) {
          setSvgHtml(res.svg);
          setIsRendering(false);
        }
      })
      .catch((err) => {
        console.error("Mermaid rendering error:", err);
        const errEl = document.getElementById("d" + uniqueId) || document.getElementById(uniqueId);
        if (errEl) errEl.remove();

        if (isMounted) {
          setRenderError("Could not render diagram visually.");
          setIsRendering(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (renderError) {
    return null;
  }

  return (
    <div className="w-full my-6 rounded-2xl border border-neon-green/30 bg-[#07080b]/90 p-4 sm:p-6 overflow-x-auto shadow-[0_0_35px_rgba(118,185,0,0.1)] flex flex-col items-center justify-center relative">
      <div className="w-full flex items-center justify-between border-b border-white/10 pb-3 mb-4 font-mono text-[11px] text-neon-green font-bold tracking-widest uppercase">
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          SYSTEM ARCHITECTURE DIAGRAM
        </span>
        <span className="text-gray-500 text-[9px]">MERMAID SVG ENGINE</span>
      </div>

      {isRendering ? (
        <div className="py-12 flex items-center justify-center gap-3 text-xs font-mono text-gray-400">
          <div className="w-4 h-4 border-2 border-neon-green border-t-transparent rounded-full animate-spin" />
          <span>Generating visual flowchart...</span>
        </div>
      ) : (
        <div
          className="mermaid-svg-container w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto font-mono"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      )}
    </div>
  );
}
