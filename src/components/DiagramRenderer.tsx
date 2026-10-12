"use client";

import { useMemo } from "react";

interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "box" | "diamond" | "circle";
  color: string;
}

interface Connection {
  fromId: string;
  toId: string;
  label?: string;
}

interface DiagramRendererProps {
  nodes: Node[];
  connections: Connection[];
  className?: string;
}

export function DiagramRenderer({ nodes, connections, className = "" }: DiagramRendererProps) {
  const svgContent = useMemo(() => {
    if (nodes.length === 0) {
      return '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><text x="150" y="100" text-anchor="middle" fill="currentColor">No diagram</text></svg>';
    }

    const padding = 60;
    const minX = Math.min(...nodes.map((n) => n.x)) - padding;
    const minY = Math.min(...nodes.map((n) => n.y)) - padding;
    const maxX = Math.max(...nodes.map((n) => n.x)) + 100 + padding;
    const maxY = Math.max(...nodes.map((n) => n.y)) + 100 + padding;

    const width = maxX - minX;
    const height = maxY - minY;

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="transparent"/>
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="rgba(74,144,226,0.8)"/>
    </marker>
  </defs>`;

    // Connections
    for (const conn of connections) {
      const from = nodes.find((n) => n.id === conn.fromId);
      const to = nodes.find((n) => n.id === conn.toId);
      if (from && to) {
        const x1 = from.x - minX + 50;
        const y1 = from.y - minY + 30;
        const x2 = to.x - minX + 50;
        const y2 = to.y - minY + 30;

        svg += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="rgba(74,144,226,0.6)" stroke-width="2.5" marker-end="url(#arrowhead)"/>`;
      }
    }

    // Nodes
    for (const node of nodes) {
      const x = node.x - minX;
      const y = node.y - minY;

      if (node.type === "box") {
        svg += `
  <rect x="${x}" y="${y}" width="100" height="60" rx="4" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>
  <text x="${x + 50}" y="${y + 35}" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="12" font-weight="500">${node.label}</text>`;
      } else if (node.type === "diamond") {
        svg += `
  <polygon points="${x + 50},${y} ${x + 100},${y + 30} ${x + 50},${y + 60} ${x},${y + 30}" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>
  <text x="${x + 50}" y="${y + 35}" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="12" font-weight="500">${node.label}</text>`;
      } else if (node.type === "circle") {
        svg += `
  <circle cx="${x + 50}" cy="${y + 30}" r="30" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>
  <text x="${x + 50}" y="${y + 35}" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="12" font-weight="500">${node.label}</text>`;
      }
    }

    svg += `
</svg>`;
    return svg;
  }, [nodes, connections]);

  return (
    <div
      className={className}
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "8px",
        padding: "16px",
        backgroundColor: "rgba(0,0,0,0.2)",
      }}
      dangerouslySetInnerHTML={{ __html: svgContent }}
    />
  );
}
