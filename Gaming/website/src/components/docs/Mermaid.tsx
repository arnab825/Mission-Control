"use client";

import { MermaidDiagram } from "@/components/docs/MermaidDiagram";

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  if (!chart || !chart.trim()) return null;
  return <MermaidDiagram chart={chart} />;
}

