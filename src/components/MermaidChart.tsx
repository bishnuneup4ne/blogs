"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getMermaidInitOptions } from "@/lib/mermaidConfig";
import styles from "./MermaidChart.module.scss";

type MermaidChartProps = {
  chart: string;
};

function prepareChart(raw: string) {
  // Unescape escaped braces and trim
  return raw.replace(/\\([{}])/g, "$1").trim();
}

function canRender(code: string): boolean {
  if (!code || code.length === 0) return false;
  
  const trimmed = code.trim();
  const firstLine = trimmed.split("\n")[0]?.trim() || "";
  
  // Check if first line matches any Mermaid diagram type
  const validDiagramTypes = [
    "flowchart",
    "graph",
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram",
    "stateDiagram-v2",
    "pie",
    "gantt",
    "gitGraph",
    "requirementDiagram",
    "mindmap",
    "timeline",
    "C4Context",
    "C4Container",
    "C4Component",
    "C4Dynamic",
    "C4Deployment",
  ];
  
  return validDiagramTypes.some(type => 
    firstLine.toLowerCase().startsWith(type.toLowerCase())
  );
}

// Check if SVG contains actual Mermaid error
function hasMermaidError(svg: string): string | null {
  // Look for error message text in SVG
  const errorPatterns = [
    /title="[^"]*Error[^"]*"(?:>|.*?<\/title>)/i,
    /<text[^>]*error[^>]*>/i,
    /Syntax error/i,
  ];
  
  for (const pattern of errorPatterns) {
    if (pattern.test(svg)) {
      return "Mermaid syntax error - check diagram syntax";
    }
  }
  
  return null;
}

/** Mermaid diagram renderer with theme support and error handling. */
export function MermaidChart({ chart }: MermaidChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const instanceId = useId().replace(/:/g, "");
  const code = prepareChart(chart);
  const ok = canRender(code);

  useEffect(() => {
    if (!ok) {
      setError("Invalid Mermaid diagram format");
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    const renderId = `mmd-${instanceId}-${Date.now()}`;

    setReady(false);
    setError(null);
    root.innerHTML = "";

    const renderDiagram = async () => {
      try {
        // Dynamically import mermaid
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        
        // Initialize mermaid with options
        await mermaid.initialize(getMermaidInitOptions());

        if (cancelled) return;

        // Render the diagram
        const { svg } = await mermaid.render(renderId, code);
        
        if (cancelled) return;
        
        if (!svg) {
          setError("Failed to generate SVG");
          return;
        }

        // Check for mermaid syntax errors in SVG
        const mermaidError = hasMermaidError(svg);
        if (mermaidError) {
          setError(mermaidError);
          return;
        }

        // Insert SVG directly
        if (!cancelled && root) {
          root.innerHTML = svg;
          setReady(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("Mermaid render error:", errorMsg);
          
          // Parse error messages for better feedback
          let displayError = "Render error";
          if (errorMsg.includes("Parse error")) {
            displayError = "Syntax error in diagram";
          } else if (errorMsg.includes("Unexpected")) {
            displayError = "Invalid diagram syntax";
          } else if (errorMsg.includes("Cannot")) {
            displayError = "Invalid diagram structure";
          } else {
            displayError = `Error: ${errorMsg.substring(0, 100)}`;
          }
          
          setError(displayError);
        }
      }
    };

    // Watch for theme changes and re-render
    const handleThemeChange = () => {
      if (!cancelled && root) {
        setReady(false);
        setError(null);
        root.innerHTML = "";
        renderDiagram();
      }
    };

    const observer = new MutationObserver(handleThemeChange);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    // Render diagram
    renderDiagram();

    return () => {
      cancelled = true;
      observer.disconnect();
      if (root) root.innerHTML = "";
    };
  }, [code, instanceId, ok]);

  if (!ok) {
    return null;
  }

  return (
    <figure className={styles.box}>
      <div ref={rootRef} className={styles.inner} />
      {!ready && !error && <p className={styles.loading}>Loading diagram…</p>}
      {error && <p className={styles.error}>{error}</p>}
    </figure>
  );
}
