import type { MermaidConfig } from "mermaid";

/** Get Mermaid init options with dynamic theme detection. */
export function getMermaidInitOptions(): MermaidConfig {
  // Detect current theme from document
  const theme = typeof window === "undefined" 
    ? "dark"
    : document.documentElement.getAttribute("data-theme") || "dark";
  
  const isDarkTheme = theme === "dark";

  return {
    startOnLoad: false,
    theme: isDarkTheme ? "dark" : "default",
    securityLevel: "loose",
    logLevel: "error",
    deterministicIds: true,
    suppressErrorRendering: false,
    themeVariables: isDarkTheme ? {
      primaryColor: "#1f2937",
      primaryTextColor: "#f3f4f6",
      primaryBorderColor: "#4b5563",
      lineColor: "#6b7280",
      secondBkgColor: "#374151",
      secondTextColor: "#e5e7eb",
      secondBorderColor: "#4b5563",
      tertiaryColor: "#4b5563",
      tertiaryTextColor: "#f3f4f6",
      tertiaryBorderColor: "#6b7280",
      background: "#000000",
      mainBkg: "#1f2937",
      clusterBkg: "#1f2937",
      clusterBorder: "#4b5563",
      textColor: "#e5e7eb",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      edgeLabelBackground: {
        labelTextColor: "#e5e7eb",
        strokeColor: "#1f2937",
        background: { color: "#1f2937", opacity: 0.8 },
      },
    } : {
      primaryColor: "#dbeafe",
      primaryTextColor: "#1e40af",
      primaryBorderColor: "#3b82f6",
      lineColor: "#9ca3af",
      secondBkgColor: "#bfdbfe",
      secondTextColor: "#1e3a8a",
      secondBorderColor: "#3b82f6",
      tertiaryColor: "#f3e8ff",
      tertiaryTextColor: "#581c87",
      tertiaryBorderColor: "#a78bfa",
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
      edgeLabelBackground: {
        labelTextColor: "#1f2937",
        strokeColor: "#f3f4f6",
        background: { color: "#f3f4f6", opacity: 0.9 },
      },
    },
    flowchart: {
      useMaxWidth: true,
      htmlLabels: true,
      curve: "basis",
      padding: 20,
      nodeSpacing: 50,
      rankSpacing: 50,
      diagramMarginX: 10,
      diagramMarginY: 10,
      arrowMarkerAbsolute: true,
    },
    sequenceDiagram: {
      actorFontSize: "14px",
      actorFontFamily: "system-ui, -apple-system, sans-serif",
      messageFontSize: "12px",
      messageFontFamily: "system-ui, -apple-system, sans-serif",
      noteFontSize: "12px",
      noteFontFamily: "system-ui, -apple-system, sans-serif",
    },
    classDiagram: {
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
    stateDiagram: {
      fontSize: "14px",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },
  } as MermaidConfig;
}
