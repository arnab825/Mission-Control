"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
}

import { sanitizeMermaidCode } from "@/lib/mermaidUtils";

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const [svgHtml, setSvgHtml] = useState<string>("");
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsRendering(true);
    setRenderError(null);

    const renderChart = async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          securityLevel: "loose",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 13,
          themeVariables: {
            darkMode: true,
            background: "transparent",
            primaryColor: "#0f172a",
            primaryTextColor: "#ffffff",
            primaryBorderColor: "#76b900",
            lineColor: "#76b900",
            textColor: "#ffffff",
            nodeTextColor: "#ffffff",
            mainBkg: "#0f172a",
            nodeBorder: "#76b900",
            clusterBkg: "#090d16",
            clusterBorder: "#1e293b",
            secondaryColor: "#1e1b4b",
            tertiaryColor: "#022c22",
          },
        });

        const uniqueId = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        const sanitizedChart = sanitizeMermaidCode(chart);

        const res = await mermaid.render(uniqueId, sanitizedChart);
        
        if (isMounted) {
          const processedSvg = res.svg
            .replace(/max-width:\s*[\d\.]+px;?/gi, "max-width: 100%;")
            .replace(/style="[^"]*"/, (m) => m.replace(/width:\s*[\d\.]+px;?/, "width: 100%;"));

          setSvgHtml(processedSvg);
          setRenderError(null);
          setIsRendering(false);
        }
      } catch (err) {
        console.warn("Mermaid rendering warning:", err);
        if (isMounted) {
          setRenderError(err instanceof Error ? err.message : "Diagram rendering error");
          setIsRendering(false);
        }
      }
    };

    renderChart();

    return () => {
      isMounted = false;
    };
  }, [chart]);

  if (renderError) {
    return (
      <div className="w-full my-6 rounded-2xl border border-amber-500/30 bg-[#0d0e12] p-4 text-xs font-mono text-gray-300">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10 text-amber-400 font-bold uppercase tracking-wider text-[10px]">
          <span>Diagram Rendering Fallback</span>
          <span>Mermaid</span>
        </div>
        <pre className="overflow-x-auto text-[11px] text-gray-400 font-mono whitespace-pre-wrap">{chart}</pre>
      </div>
    );
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
          className="mermaid-svg-container w-full min-w-full overflow-x-auto flex justify-center [&>svg]:w-full [&>svg]:max-w-none [&>svg]:h-auto font-mono py-2"
          dangerouslySetInnerHTML={{ __html: svgHtml }}
        />
      )}
    </div>
  );
}
