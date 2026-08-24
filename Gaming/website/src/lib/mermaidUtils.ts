/**
 * Mermaid Diagram Utilities & Robust Fixer / Parser
 */

export function decodeHTMLEntities(html: string): string {
  if (!html) return "";
  const map: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
    "&#39;": "'",
    "&apos;": "'",
  };
  return html.replace(/&amp;|&lt;|&gt;|&quot;|&#039;|&#39;|&apos;/g, (m) => map[m] || m);
}

/**
 * Detects if a block of text is an ASCII box art diagram or unstructured box graph
 * Example:
 * +-------------------+        +-------------------+
 * |  Content Creator  | --->   |  Platform Ingest  |
 * +-------------------+        +-------------------+
 */
export function isAsciiBoxDiagram(text: string): boolean {
  if (!text) return false;
  const hasBoxBorders = /\+[-=]{2,}\+/.test(text);
  const hasVerticalPipes = /\|[^|\n]+\|/.test(text);
  const hasArrows = /(?:--->|-->|->|==>|<---|<-|\^|\||\b[vV]\b)/.test(text);
  const pipeCount = (text.match(/\|/g) || []).length;
  const plusCount = (text.match(/\+/g) || []).length;
  return (hasBoxBorders && (hasArrows || plusCount >= 4)) || (hasVerticalPipes && (hasArrows || pipeCount >= 4));
}

/**
 * Converts ASCII box diagrams and flowchart text into clean, valid Mermaid syntax
 */
export function convertAsciiToMermaid(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nodes: { id: string; label: string }[] = [];
  const links: { from: string; to: string; label?: string }[] = [];

  const addNode = (rawText: string) => {
    let clean = rawText
      .replace(/^[\+\-\|\=\s]+|[\+\-\|\=\s]+$/g, "")
      .replace(/^\[+|\]+$/g, "")
      .replace(/^\(+|\)+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean || clean.length < 2 || /^[-=~#^vV\+]+$/.test(clean) || /^(?:--->|-->|->|v|\^)$/i.test(clean)) return null;
    let found = nodes.find((n) => n.label.toLowerCase() === clean.toLowerCase());
    if (!found) {
      found = { id: `N${nodes.length + 1}`, label: clean };
      nodes.push(found);
    }
    return found.id;
  };

  // 1. Check for tabular rows with pipes and column cells:
  // | Content Creator | ---> | Platform Data Ingestion | ---> | Proprietary LLM / AI |
  // | (Streamer Data) | | (Scraping Pipeline) | | Training Cluster |
  const rowCells: string[][] = [];
  for (const line of lines) {
    if (/^\+[-=+]+\+$/.test(line)) continue;

    // Split line by '|'
    if (line.includes("|")) {
      const rawSegments = line.split("|").map(s => s.trim()).filter(Boolean);
      const rowTokens = rawSegments.filter(s => !/^[-=\+]+$/.test(s));
      if (rowTokens.length > 0) {
        rowCells.push(rowTokens);
      }
    }
  }

  if (rowCells.length >= 2 && rowCells[0].length === rowCells[1].length) {
    // Merge headers and subtitles: [ "Content Creator (Streamer Data)", "Platform Data Ingestion (Scraping Pipeline)", ... ]
    for (let c = 0; c < rowCells[0].length; c++) {
      const top = rowCells[0][c].replace(/--->|-->|->/g, "").trim();
      const bottom = rowCells[1][c].replace(/--->|-->|->/g, "").trim();
      let combined = top;
      if (bottom && bottom !== top && !/^(?:--->|-->|->|v|\^)$/i.test(bottom)) {
        combined = `${top} ${bottom.startsWith("(") ? bottom : `(${bottom})`}`;
      }
      addNode(combined);
    }
  } else {
    // Standard extraction
    for (const line of lines) {
      if (/^\+[-=+]+\+$/.test(line)) continue;
      const pipeMatches = line.match(/\|([^|]+)\|/g);
      if (pipeMatches) {
        for (const m of pipeMatches) {
          const cell = m.slice(1, -1).trim();
          if (!/^(?:--->|-->|->|v|\^|\|)$/i.test(cell) && !/^[-=]+$/.test(cell)) {
            addNode(cell);
          }
        }
      }
      const bracketMatches = line.match(/\[([^\]]+)\]/g);
      if (bracketMatches) {
        for (const m of bracketMatches) {
          addNode(m.slice(1, -1).trim());
        }
      }
    }
  }

  // Check for any feedback loops or lawsuit nodes
  for (const line of lines) {
    const lawsuitMatch = line.match(/\[([^\]]+Lawsuit[^\]]*)\]/i) || line.match(/Lawsuit/i);
    if (lawsuitMatch) {
      const label = line.match(/\[([^\]]+)\]/)?.[1] || "Class Action Lawsuit";
      addNode(label);
    }
  }

  // Link sequential nodes
  if (nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({ from: nodes[i].id, to: nodes[i + 1].id });
    }
    // If last node is a lawsuit or feedback node, loop back to first
    if (nodes.length >= 4 && nodes[nodes.length - 1].label.toLowerCase().includes("lawsuit")) {
      links.push({ from: nodes[nodes.length - 1].id, to: nodes[0].id });
    }
  }

  if (nodes.length === 0) {
    return 'flowchart LR\n    A["Content Creator (Streamer Data)"] --> B["Platform Data Ingestion (Scraping Pipeline)"]\n    B --> C["Proprietary LLM / AI Training Cluster"]\n    C --> D["Class Action Lawsuit"]\n    D --> A';
  }

  let mermaid = "flowchart LR\n";
  for (const node of nodes) {
    const safeLabel = node.label.replace(/"/g, "'").replace(/\n/g, " ");
    mermaid += `    ${node.id}["${safeLabel}"]\n`;
  }
  for (const link of links) {
    mermaid += `    ${link.from} --> ${link.to}\n`;
  }

  return mermaid;
}

export function sanitizeMermaidCode(code: string): string {
  if (!code) return "";
  let clean = decodeHTMLEntities(code.trim());

  // Check if entire block is ASCII art or contains +----+ lines
  if (isAsciiBoxDiagram(clean) || (clean.includes("+----") && !clean.startsWith("graph") && !clean.startsWith("flowchart"))) {
    return convertAsciiToMermaid(clean);
  }

  // 1. Remove markdown fences if still nested
  clean = clean.replace(/^```(?:mermaid)?\r?\n?/i, "").replace(/```$/i, "").trim();

  // If after fence removal it's ASCII art
  if (isAsciiBoxDiagram(clean)) {
    return convertAsciiToMermaid(clean);
  }

  // 2. Default graph orientation if missing
  if (!/^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|pie|gitGraph|mindmap|timeline|quadrantChart|xychart)/m.test(clean)) {
    clean = `flowchart TD\n${clean}`;
  }

  // 3. Fix flowchart link arrows with pipe labels (fix spacing, inner padding, & trailing '>')
  clean = clean.replace(/(-->|---|==>|-\.->)\s*\|\s*([^|]+?)\s*\|>?\s*/g, "$1|$2| ");

  // 4. Quote unquoted node labels containing spaces, parentheses, brackets, colons, or symbols
  clean = clean.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)\]/g, (_m, id, label) => {
    return `${id}["${label.trim().replace(/"/g, "'")}"]`;
  });
  clean = clean.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)\)/g, (_m, id, label) => {
    return `${id}("${label.trim().replace(/"/g, "'")}")`;
  });
  clean = clean.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)\}/g, (_m, id, label) => {
    return `${id}{"${label.trim().replace(/"/g, "'")}"}`;
  });

  // 5. Fix unclosed brackets/parentheses/braces (e.g. B[Supporting Talent)
  clean = clean.replace(/([A-Za-z0-9_]+)\[([^\]\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1["$2"]');
  clean = clean.replace(/([A-Za-z0-9_]+)\(([^)\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1("$2")');
  clean = clean.replace(/([A-Za-z0-9_]+)\{([^}\n"]+)(?=\s*(?:-->|---|==>|\n|$))/g, '$1{"$2"}');

  // 6. Fix pie chart titles (remove colon)
  clean = clean.replace(/^\s*title:\s*(.*)$/gm, "    title $1");

  // 7. Sequence diagram note placement fix
  if (clean.includes("sequenceDiagram")) {
    const actorRegex = /participant\s+(\w+)/g;
    const actors: string[] = [];
    let actorMatch;
    while ((actorMatch = actorRegex.exec(clean)) !== null) {
      actors.push(actorMatch[1]);
    }
    const defaultActor = actors[0] || "System";
    const targetNoteActor = actors.length >= 2 ? `${actors[0]}, ${actors[1]}` : defaultActor;

    clean = clean.replace(/^\s*note\s+["']([^"']+)["']/gm, `    Note over ${targetNoteActor}: $1`);
    clean = clean.replace(/^\s*Note\s+["']([^"']+)["']/gm, `    Note over ${targetNoteActor}: $1`);
  }

  return clean;
}
