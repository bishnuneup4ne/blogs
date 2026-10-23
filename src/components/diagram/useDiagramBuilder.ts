"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface DiagramNode {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "box" | "diamond" | "circle";
  color: string;
}

export interface DiagramConnection {
  fromId: string;
  toId: string;
  label?: string;
}

export type DiagramMode = "select" | "draw-box" | "draw-diamond" | "draw-circle" | "connect";

export interface DiagramSnapshot {
  nodes: DiagramNode[];
  connections: DiagramConnection[];
}

const GRID = 20;

/** Snap a coordinate to the 20px grid. */
function snap(value: number): number {
  return Math.round(value / GRID) * GRID;
}

/**
 * Shared state machine for the diagram builder.
 *
 * Both `/admin/diagram-builder` and `/tools/diagram-builder` render the same
 * editor; this hook owns the logic so there is a single implementation to
 * maintain and a single place where the state-transition bugs live.
 *
 * All state transitions use the functional form so that rapid events
 * (drag + add, drag + delete) never write a stale snapshot.
 */
export function useDiagramBuilder(defaultColor = "#58a6ff") {
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [connections, setConnections] = useState<DiagramConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeColor, setNodeColor] = useState(defaultColor);
  const [mode, setMode] = useState<DiagramMode>("select");
  const [fromNode, setFromNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [history, setHistory] = useState<DiagramSnapshot[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);

  // The history stack needs the *current* graph at the moment of the action.
  // Keeping it in a ref avoids stale-closure writes and lets `pushHistory`
  // stay stable across renders.
  const graphRef = useRef<DiagramSnapshot>({ nodes: [], connections: [] });
  graphRef.current = { nodes, connections };

  const pushHistory = useCallback(() => {
    const snapshot = { nodes: graphRef.current.nodes, connections: graphRef.current.connections };
    setHistory((prev) => [...prev.slice(-49), snapshot]);
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setNodes(previous.nodes);
      setConnections(previous.connections);
      setSelectedNode(null);
      setFromNode(null);
      return prev.slice(0, -1);
    });
  }, []);

  const addNode = useCallback(
    (x: number, y: number, type: DiagramNode["type"] = "box") => {
      pushHistory();
      // crypto.randomUUID avoids the `Date.now()` collision that produced
      // duplicate ids (and therefore duplicate React keys) for rapid clicks.
      const id = `node-${crypto.randomUUID()}`;
      setNodes((prev) => {
        const newNode: DiagramNode = {
          id,
          x: snap(x),
          y: snap(y),
          label: `Node ${prev.length + 1}`,
          type,
          color: nodeColor,
        };
        return [...prev, newNode];
      });
      setSelectedNode(id);
    },
    [nodeColor, pushHistory],
  );

  const updateNode = useCallback((id: string, updates: Partial<DiagramNode>) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  }, []);

  const deleteNode = useCallback(
    (id: string) => {
      pushHistory();
      setNodes((prev) => prev.filter((n) => n.id !== id));
      setConnections((prev) => prev.filter((c) => c.fromId !== id && c.toId !== id));
      setSelectedNode((prev) => (prev === id ? null : prev));
      setFromNode((prev) => (prev === id ? null : prev));
    },
    [pushHistory],
  );

  const startConnection = useCallback((id: string) => {
    setFromNode(id);
    setMode("connect");
  }, []);

  const endConnection = useCallback(
    (toId: string) => {
      setConnections((prev) => {
        if (!fromNode || fromNode === toId) return prev;
        if (prev.some((c) => c.fromId === fromNode && c.toId === toId)) return prev;
        return [...prev, { fromId: fromNode, toId }];
      });
      setMode("select");
      setFromNode(null);
    },
    [fromNode],
  );

  const deleteConnection = useCallback(
    (from: string, to: string) => {
      pushHistory();
      setConnections((prev) => prev.filter((c) => !(c.fromId === from && c.toId === to)));
    },
    [pushHistory],
  );

  const clearAll = useCallback(() => {
    pushHistory();
    setNodes([]);
    setConnections([]);
    setSelectedNode(null);
    setFromNode(null);
    setMode("select");
  }, [pushHistory]);

  const updateLabel = useCallback(
    (id: string, label: string) => {
      updateNode(id, { label });
    },
    [updateNode],
  );

  // Escape clears the selection and drops out of any drawing mode.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNode(null);
        setMode("select");
        setFromNode(null);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    nodes,
    connections,
    selectedNode,
    setSelectedNode,
    nodeLabel,
    setNodeLabel,
    nodeColor,
    setNodeColor,
    mode,
    setMode,
    fromNode,
    draggedNode,
    setDraggedNode,
    history,
    showGrid,
    setShowGrid,
    pointer,
    setPointer,
    setNodes,
    setConnections,
    addNode,
    updateNode,
    updateLabel,
    deleteNode,
    startConnection,
    endConnection,
    deleteConnection,
    clearAll,
    undo,
    pushHistory,
  };
}

/**
 * Render the graph as a standalone SVG document.
 *
 * `accent` is the hex brand colour used for strokes and fills so the same
 * component can serve the admin (brand accent) and public tools pages.
 */
export function generateDiagramSVG(
  nodes: DiagramNode[],
  connections: DiagramConnection[],
  accent: string,
): string {
  if (nodes.length === 0) {
    return '<svg viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg"><text x="150" y="100" text-anchor="middle" fill="currentColor">No diagram yet</text></svg>';
  }

  const padding = 60;
  const minX = Math.min(...nodes.map((n) => n.x)) - padding;
  const minY = Math.min(...nodes.map((n) => n.y)) - padding;
  const maxX = Math.max(...nodes.map((n) => n.x)) + 100 + padding;
  const maxY = Math.max(...nodes.map((n) => n.y)) + 100 + padding;

  const width = maxX - minX;
  const height = maxY - minY;

  // Hex -> rgba() so the accent can be used as a translucent fill.
  const accentRgba = (alpha: number) => {
    const hex = accent.replace("#", "");
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const num = Number.parseInt(full, 16);
    if (!Number.isFinite(num)) return `rgba(88,166,255,${alpha})`;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${alpha})`;
  };

  let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="transparent"/>

  <!-- Connections -->`;

  for (const conn of connections) {
    const from = nodes.find((n) => n.id === conn.fromId);
    const to = nodes.find((n) => n.id === conn.toId);
    if (!from || !to) continue;
    svg += `
  <line x1="${from.x + 50}" y1="${from.y + 30}" x2="${to.x + 50}" y2="${to.y + 30}"
        stroke="${accent}" stroke-width="2.5" marker-end="url(#arrowhead)"/>`;
  }

  svg += `
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
      <polygon points="0 0, 10 3, 0 6" fill="${accent}" />
    </marker>
  </defs>

  <!-- Nodes -->`;

  for (const node of nodes) {
    const { x, y } = node;
    if (node.type === "diamond") {
      svg += `
  <polygon points="${x + 50},${y} ${x + 100},${y + 30} ${x + 50},${y + 60} ${x},${y + 30}"
           fill="${accentRgba(0.15)}" stroke="${node.color}" stroke-width="2"/>`;
    } else if (node.type === "circle") {
      svg += `
  <circle cx="${x + 50}" cy="${y + 30}" r="30" fill="${accentRgba(0.15)}" stroke="${node.color}" stroke-width="2"/>`;
    } else {
      svg += `
  <rect x="${x}" y="${y}" width="100" height="60" rx="4" fill="${accentRgba(0.15)}" stroke="${node.color}" stroke-width="2"/>`;
    }
    svg += `
  <text x="${x + 50}" y="${y + 30}" text-anchor="middle" dominant-baseline="middle"
        fill="currentColor" font-size="12" font-weight="500">${escapeXmlText(node.label)}</text>`;
  }

  svg += `
</svg>`;

  return svg;
}

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
