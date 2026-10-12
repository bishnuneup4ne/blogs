"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./builder.module.scss";

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

type Mode = "select" | "draw-box" | "draw-diamond" | "draw-circle" | "connect";

export default function DiagramBuilder() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [nodeLabel, setNodeLabel] = useState("");
  const [nodeColor, setNodeColor] = useState("#4a90e2");
  const [mode, setMode] = useState<Mode>("select");
  const [fromNode, setFromNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [history, setHistory] = useState<Array<{ nodes: Node[]; connections: Connection[] }>>([]);
  const [showGrid, setShowGrid] = useState(true);

  const addToHistory = () => {
    setHistory([...history, { nodes, connections }]);
  };

  const undo = () => {
    if (history.length > 0) {
      const newHistory = [...history];
      const previous = newHistory.pop();
      if (previous) {
        setNodes(previous.nodes);
        setConnections(previous.connections);
        setHistory(newHistory);
      }
    }
  };

  const addNode = (x: number, y: number, type: "box" | "diamond" | "circle" = "box") => {
    const newNode: Node = {
      id: `node-${Date.now()}`,
      x: Math.round(x / 20) * 20,
      y: Math.round(y / 20) * 20,
      label: `Node ${nodes.length + 1}`,
      type,
      color: nodeColor,
    };
    addToHistory();
    setNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
    setNodeLabel(newNode.label);
  };

  const updateNode = (id: string, updates: Partial<Node>) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNode = (id: string) => {
    addToHistory();
    setNodes(nodes.filter((n) => n.id !== id));
    setConnections(connections.filter((c) => c.fromId !== id && c.toId !== id));
    setSelectedNode(null);
  };

  const startConnection = (id: string) => {
    setFromNode(id);
    setMode("connect");
  };

  const endConnection = (toId: string) => {
    if (fromNode && fromNode !== toId) {
      const exists = connections.some((c) => c.fromId === fromNode && c.toId === toId);
      if (!exists) {
        addToHistory();
        setConnections([...connections, { fromId: fromNode, toId }]);
      }
    }
    setMode("select");
    setFromNode(null);
  };

  const deleteConnection = (from: string, to: string) => {
    addToHistory();
    setConnections(connections.filter((c) => !(c.fromId === from && c.toId === to)));
  };

  const generateSVG = () => {
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

    let svg = `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="transparent"/>
  
  <!-- Connections -->`;

    for (const conn of connections) {
      const from = nodes.find((n) => n.id === conn.fromId);
      const to = nodes.find((n) => n.id === conn.toId);
      if (from && to) {
        const x1 = from.x - minX + 50;
        const y1 = from.y - minY + 50;
        const x2 = to.x - minX + 50;
        const y2 = to.y - minY + 50;

        svg += `
  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="currentColor" stroke-width="2"/>
  <polygon points="${x2},${y2} ${x2 - 8},${y2 - 6} ${x2 - 8},${y2 + 6}" fill="currentColor"/>`;
      }
    }

    svg += `
  
  <!-- Nodes -->`;

    for (const node of nodes) {
      const x = node.x - minX;
      const y = node.y - minY;

      if (node.type === "box") {
        svg += `
  <rect x="${x}" y="${y}" width="100" height="60" rx="4" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>`;
      } else if (node.type === "diamond") {
        svg += `
  <polygon points="${x + 50},${y} ${x + 100},${y + 30} ${x + 50},${y + 60} ${x},${y + 30}" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>`;
      } else if (node.type === "circle") {
        svg += `
  <circle cx="${x + 50}" cy="${y + 30}" r="30" fill="rgba(74,144,226,0.15)" stroke="${node.color}" stroke-width="2"/>`;
      }

      svg += `
  <text x="${x + 50}" y="${y + 35}" text-anchor="middle" dominant-baseline="middle" fill="currentColor" font-size="12" font-weight="500">${node.label}</text>`;
    }

    svg += `
</svg>`;

    return svg;
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode === "select") {
      setSelectedNode(null);
      return;
    }

    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const pt = new DOMPoint(e.clientX - rect.left, e.clientY - rect.top);
    const screenToSvgMatrix = svg.getScreenCTM()?.inverse();
    if (!screenToSvgMatrix) return;
    const svgPt = pt.matrixTransform(screenToSvgMatrix);

    if (mode === "draw-box") addNode(svgPt.x, svgPt.y, "box");
    else if (mode === "draw-diamond") addNode(svgPt.x, svgPt.y, "diamond");
    else if (mode === "draw-circle") addNode(svgPt.x, svgPt.y, "circle");

    setMode("select");
  };

  const handleNodeMouseDown = (nodeId: string, e: React.MouseEvent<SVGRectElement | SVGCircleElement | SVGPolygonElement>) => {
    if (mode === "connect") {
      e.stopPropagation();
      endConnection(nodeId);
      return;
    }
    e.preventDefault();
    setDraggedNode(nodeId);
    setSelectedNode(nodeId);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggedNode || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const pt = new DOMPoint(e.clientX - rect.left, e.clientY - rect.top);
    const screenToSvgMatrix = svg.getScreenCTM()?.inverse();
    if (!screenToSvgMatrix) return;
    const svgPt = pt.matrixTransform(screenToSvgMatrix);

    updateNode(draggedNode, {
      x: Math.round(svgPt.x / 20) * 20,
      y: Math.round(svgPt.y / 20) * 20,
    });
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

  useEffect(() => {
    const handleDocumentMouseUp = () => {
      setDraggedNode(null);
    };

    document.addEventListener("mouseup", handleDocumentMouseUp);
    return () => document.removeEventListener("mouseup", handleDocumentMouseUp);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedNode(null);
        setMode("select");
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function PreviewDiagram({ svg }: { svg: string }) {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
      if (iframeRef.current && svg) {
        iframeRef.current.srcdoc = `<!DOCTYPE html><html><body style="margin:0;padding:0">${svg}</body></html>`;
      }
    }, [svg]);

    return (
      <iframe
        ref={iframeRef}
        style={{
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          width: "100%",
          minHeight: "300px",
          backgroundColor: "rgba(0,0,0,0.2)",
        }}
        title="Diagram preview"
      />
    );
  }

  const getModeIcon = (m: Mode) => {
    const icons: Record<Mode, string> = {
      select: "👆",
      "draw-box": "▭",
      "draw-diamond": "◇",
      "draw-circle": "●",
      connect: "🔗",
    };
    return icons[m];
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Diagram Builder</h1>
        <p>Like a paint app - drag nodes, click buttons to draw, connect shapes</p>
      </div>

      <div className={styles.toolBar}>
        <div className={styles.tools}>
          <h3>Tools</h3>
          <button
            type="button"
            className={`${styles.toolBtn} ${mode === "select" ? styles.active : ""}`}
            onClick={() => setMode("select")}
            title="Select and drag (S)"
          >
            👆 Select
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${mode === "draw-box" ? styles.active : ""}`}
            onClick={() => setMode("draw-box")}
            title="Click canvas to draw box"
          >
            ▭ Box
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${mode === "draw-diamond" ? styles.active : ""}`}
            onClick={() => setMode("draw-diamond")}
            title="Click canvas to draw diamond"
          >
            ◇ Diamond
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${mode === "draw-circle" ? styles.active : ""}`}
            onClick={() => setMode("draw-circle")}
            title="Click canvas to draw circle"
          >
            ● Circle
          </button>
        </div>

        <div className={styles.tools}>
          <h3>Appearance</h3>
          <div className={styles.control}>
            <label htmlFor="color">Color:</label>
            <input
              id="color"
              type="color"
              value={nodeColor}
              onChange={(e) => setNodeColor(e.target.value)}
            />
          </div>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            Show Grid
          </label>
        </div>

        {selectedNode && (
          <div className={styles.tools}>
            <h3>Selected Node</h3>
            <div className={styles.control}>
              <label htmlFor="label">Label:</label>
              <input
                id="label"
                type="text"
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                onBlur={() => {
                  updateNode(selectedNode, { label: nodeLabel });
                }}
              />
            </div>
            <button
              type="button"
              className={`${styles.toolBtn} ${styles.primary}`}
              onClick={() => startConnection(selectedNode)}
            >
              🔗 Connect
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${styles.danger}`}
              onClick={() => deleteNode(selectedNode)}
            >
              🗑️ Delete
            </button>
          </div>
        )}

        <div className={styles.tools}>
          <h3>File</h3>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={undo}
            disabled={history.length === 0}
            title="Undo last action"
          >
            ↶ Undo
          </button>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => {
              addToHistory();
              setNodes([]);
              setConnections([]);
              setSelectedNode(null);
            }}
          >
            ✕ Clear
          </button>
        </div>

        <div className={styles.tools}>
          <h3>Export</h3>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.success}`}
            onClick={() => {
              const svg = generateSVG();
              const blob = new Blob([svg], { type: "image/svg+xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "diagram.svg";
              a.click();
            }}
          >
            ⬇️ SVG File
          </button>
          <button
            type="button"
            className={`${styles.toolBtn} ${styles.success}`}
            onClick={() => {
              const svg = generateSVG();
              navigator.clipboard.writeText(svg);
              alert("SVG copied!");
            }}
          >
            📋 Copy Code
          </button>
        </div>
      </div>

      <div className={styles.workspace}>
        <div className={styles.canvasContainer}>
          <svg
            ref={svgRef}
            className={styles.canvas}
            viewBox="0 0 1200 700"
            onMouseMove={handleMouseMove}
            onClick={handleCanvasClick}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSelectedNode(null);
                setMode("select");
              }
            }}
            role="img"
            aria-label="Diagram canvas - click to add shapes, drag to move nodes"
            style={{
              cursor: mode === "select" && draggedNode ? "grabbing" : mode === "select" ? "grab" : "crosshair",
              userSelect: "none",
            }}
          >
            {/* Grid */}
            {showGrid && (
              <>
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="1200" height="700" fill="url(#grid)" />
              </>
            )}

            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 10 3, 0 6" fill="#4a90e2" />
              </marker>
            </defs>

            {/* Connections */}
            {connections.map((conn) => {
              const from = nodes.find((n) => n.id === conn.fromId);
              const to = nodes.find((n) => n.id === conn.toId);
              if (!from || !to) return null;

              return (
                <g key={`${conn.fromId}-${conn.toId}`} className={styles.connectionGroup}>
                  <line
                    x1={from.x + 50}
                    y1={from.y + 30}
                    x2={to.x + 50}
                    y2={to.y + 30}
                    stroke="#4a90e2"
                    strokeWidth="2.5"
                    markerEnd="url(#arrowhead)"
                    className={styles.connectionLine}
                  />
                  <rect
                    x={Math.min(from.x, to.x) - 20}
                    y={Math.min(from.y, to.y) - 20}
                    width={Math.abs(to.x - from.x) + 140}
                    height={Math.abs(to.y - from.y) + 80}
                    fill="transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConnection(conn.fromId, conn.toId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Delete") {
                        deleteConnection(conn.fromId, conn.toId);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={styles.connectionHitbox}
                    aria-label="Connection - press Delete to remove"
                  />
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => (
              <g
                key={node.id}
                className={`${styles.nodeGroup} ${selectedNode === node.id ? styles.selected : ""} ${draggedNode === node.id ? styles.dragging : ""}`}
              >
                {node.type === "box" && (
                  <rect
                    x={node.x}
                    y={node.y}
                    width="100"
                    height="60"
                    rx="4"
                    fill={selectedNode === node.id ? "rgba(74,144,226,0.4)" : "rgba(74,144,226,0.15)"}
                    stroke={node.color}
                    strokeWidth={selectedNode === node.id ? "3" : "2"}
                    className={styles.nodeShape}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  />
                )}

                {node.type === "diamond" && (
                  <polygon
                    points={`${node.x + 50},${node.y} ${node.x + 100},${node.y + 30} ${node.x + 50},${node.y + 60} ${node.x},${node.y + 30}`}
                    fill={selectedNode === node.id ? "rgba(74,144,226,0.4)" : "rgba(74,144,226,0.15)"}
                    stroke={node.color}
                    strokeWidth={selectedNode === node.id ? "3" : "2"}
                    className={styles.nodeShape}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  />
                )}

                {node.type === "circle" && (
                  <circle
                    cx={node.x + 50}
                    cy={node.y + 30}
                    r="30"
                    fill={selectedNode === node.id ? "rgba(74,144,226,0.4)" : "rgba(74,144,226,0.15)"}
                    stroke={node.color}
                    strokeWidth={selectedNode === node.id ? "3" : "2"}
                    className={styles.nodeShape}
                    onMouseDown={(e) => handleNodeMouseDown(node.id, e)}
                  />
                )}

                <text
                  x={node.x + 50}
                  y={node.y + 30}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="currentColor"
                  fontSize="12"
                  fontWeight="500"
                  pointerEvents="none"
                  className={styles.nodeLabel}
                >
                  {node.label}
                </text>

                {/* Selection ring */}
                {selectedNode === node.id && (
                  <circle
                    cx={node.x + 50}
                    cy={node.y + 30}
                    r="50"
                    fill="none"
                    stroke="rgba(74,144,226,0.3)"
                    strokeWidth="1"
                    strokeDasharray="5,5"
                    pointerEvents="none"
                  />
                )}
              </g>
            ))}

            {/* Connection preview line when in connect mode */}
            {mode === "connect" && fromNode && selectedNode === fromNode && (
              <line
                x1={nodes.find((n) => n.id === fromNode)?.x || 0 + 50}
                y1={nodes.find((n) => n.id === fromNode)?.y || 0 + 30}
                x2={nodes.find((n) => n.id === fromNode)?.x || 0 + 50}
                y2={nodes.find((n) => n.id === fromNode)?.y || 0 + 30}
                stroke="rgba(74,144,226,0.5)"
                strokeWidth="2"
                strokeDasharray="5,5"
                pointerEvents="none"
              />
            )}
          </svg>
        </div>

        <div className={styles.sidePanel}>
          <div className={styles.stats}>
            <div>Nodes: {nodes.length}</div>
            <div>Connections: {connections.length}</div>
          </div>

          {selectedNode && (
            <div className={styles.nodesList}>
              <h4>Selected</h4>
              <div className={styles.nodeItem}>
                {nodes.find((n) => n.id === selectedNode)?.label}
              </div>
            </div>
          )}

          <div className={styles.nodesList}>
            <h4>All Nodes</h4>
            <div className={styles.nodesListScroll}>
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className={`${styles.nodeListItem} ${selectedNode === node.id ? styles.active : ""}`}
                  onClick={() => {
                    setSelectedNode(node.id);
                    setNodeLabel(node.label);
                  }}
                  style={{ borderLeftColor: node.color }}
                  aria-label={`Node: ${node.label}`}
                >
                  {node.label}
                </button>
              ))}
            </div>
          </div>

          <PreviewDiagram svg={generateSVG()} />
        </div>
      </div>
    </div>
  );
}
