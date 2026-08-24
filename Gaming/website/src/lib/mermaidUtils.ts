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
  const hasBoxBorders = /\+[-=]{3,}\+|\+[-=]{2,}/.test(text);
  const hasVerticalPipes = /\|[^|\n]+\|/.test(text);
  const hasArrows = /(?:--->|-->|->|==>|<---|<-|\^|\||\b[vV]\b)/.test(text);
  return (hasBoxBorders || hasVerticalPipes) && (hasArrows || (text.match(/\|/g) || []).length >= 4);
}

/**
 * Converts ASCII box diagrams and flowchart text into clean, valid Mermaid syntax
 */
export function convertAsciiToMermaid(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const nodes: { id: string; label: string }[] = [];
  const links: { from: string; to: string; label?: string }[] = [];

  // Extract labels from boxes or pipes: | Text Here | or [ Text Here ]
  const rawLabels: string[] = [];
  for (const line of lines) {
    if (/^\+[-=+]+\+$/.test(line)) continue;

    // Check for inline horizontal flows with arrows: | A | ---> | B | ---> | C |
    if (line.includes("|") && (line.includes("->") || line.includes("-->") || line.includes("--->"))) {
      const parts = line.split(/(?:--->|-->|->|==>)/).map((p) => p.trim());
      const lineNodeIds: string[] = [];

      for (const part of parts) {
        const cleanLabel = part.replace(/^\|+|\|+$/g, "").replace(/^\[+|\]+$/g, "").trim();
        if (cleanLabel && cleanLabel.length > 1) {
          let existing = nodes.find((n) => n.label === cleanLabel);
          if (!existing) {
            const nodeId = `N${nodes.length + 1}`;
            existing = { id: nodeId, label: cleanLabel };
            nodes.push(existing);
          }
          lineNodeIds.push(existing.id);
        }
      }

      for (let i = 0; i < lineNodeIds.length - 1; i++) {
        links.push({ from: lineNodeIds[i], to: lineNodeIds[i + 1] });
      }
      continue;
    }

    // Pipe line with multiple columns: | Streamer Data | | Scraping Pipeline | | Training Cluster |
    const pipeMatches = line.match(/\|([^|]+)\|/g);
    if (pipeMatches && pipeMatches.length > 0) {
      for (const match of pipeMatches) {
        const inner = match.slice(1, -1).trim();
        if (inner && !/^[-=\s]+$/.test(inner) && !/^(?:--->|-->|->|v|\^)$/i.test(inner)) {
          rawLabels.push(inner);
        }
      }
    } else if (line.startsWith("[") && line.endsWith("]")) {
      const inner = line.slice(1, -1).trim();
      if (inner) rawLabels.push(inner);
    }
  }

  // If we found nodes from tabular/pipe extraction but haven't linked them
  if (nodes.length === 0 && rawLabels.length > 0) {
    const uniqueLabels = Array.from(new Set(rawLabels));
    uniqueLabels.forEach((label, idx) => {
      nodes.push({ id: `Node${idx + 1}`, label });
    });

    for (let i = 0; i < nodes.length - 1; i++) {
      links.push({ from: nodes[i].id, to: nodes[i + 1].id });
    }
  }

  if (nodes.length === 0) {
    return 'flowchart TD\n    A["Data Ingestion"] --> B["Processing Pipeline"]\n    B --> C["AI Model / Cluster"]';
  }

  let mermaid = "flowchart LR\n";
  for (const node of nodes) {
    const safeLabel = node.label.replace(/"/g, "'").replace(/\n/g, " ");
    mermaid += `    ${node.id}["${safeLabel}"]\n`;
  }
  for (const link of links) {
    if (link.label) {
      mermaid += `    ${link.from} -->|"${link.label}"| ${link.to}\n`;
    } else {
      mermaid += `    ${link.from} --> ${link.to}\n`;
    }
  }

  return mermaid;
}

/**
 * Normalizes and fixes common syntax bugs in Mermaid diagrams
 */
export function sanitizeMermaidCode(code: string): string {
  if (!code) return "";
  let clean = decodeHTMLEntities(code.trim());

  // Check if entire block is ASCII art instead of valid Mermaid diagram
  if (isAsciiBoxDiagram(clean) && !/^(?:graph|flowchart|sequenceDiagram|gantt|classDiagram|stateDiagram|erDiagram|journey|pie|gitGraph|mindmap|timeline|quadrantChart|xychart)/m.test(clean)) {
    return convertAsciiToMermaid(clean);
  }

  // 1. Remove markdown fences if still nested
  clean = clean.replace(/^```mermaid\r?\n?/i, "").replace(/```$/i, "").trim();

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
