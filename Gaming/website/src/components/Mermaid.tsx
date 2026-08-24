"use client";

import { MermaidDiagram } from "@/components/MermaidDiagram";

interface MermaidProps {
  chart: string;
}

export default function Mermaid({ chart }: MermaidProps) {
  if (!chart || !chart.trim()) return null;
  return <MermaidDiagram chart={chart} />;
}

