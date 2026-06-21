"use client";

import dynamic from "next/dynamic";
import "easymde/dist/easymde.min.css";
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import type SimpleMDE from "easymde";

const SimpleMdeReact = dynamic(() => import("react-simplemde-editor"), { ssr: false });

export interface MarkdownEditorHandle {
  insertText: (text: string) => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor({ value, onChange, placeholder }, ref) {
    const mdeRef = useRef<SimpleMDE | null>(null);

    useImperativeHandle(ref, () => ({
      insertText(text: string) {
        const cm = mdeRef.current?.codemirror;
        if (cm) {
          cm.replaceSelection(text);
          onChange(cm.getValue());
        } else {
          onChange(value + text);
        }
      },
    }));

    const options = useMemo(() => {
      return {
        spellChecker: false,
        placeholder: placeholder || "# Write your content here...",
        status: false,
        toolbar: [
          "bold", "italic", "heading", "|",
          "quote", "unordered-list", "ordered-list", "|",
          "link", "image", "code", "table", "horizontal-rule", "|",
          {
            name: "image-left",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<img src="YOUR_IMAGE_URL" align="left" width="50%" alt="description" />',
              );
            },
            className: "fa fa-align-left",
            title: "Insert Left-Aligned Image",
          },
          {
            name: "image-center",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<div align="center">\n  <img src="YOUR_IMAGE_URL" width="80%" alt="description" />\n</div>\n',
              );
            },
            className: "fa fa-align-center",
            title: "Insert Centered Image",
          },
          {
            name: "image-right",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                '<img src="YOUR_IMAGE_URL" align="right" width="50%" alt="description" />',
              );
            },
            className: "fa fa-align-right",
            title: "Insert Right-Aligned Image",
          },
          "|",
          {
            name: "flowchart",
            action: (editor: SimpleMDE) => {
              editor.codemirror.replaceSelection(
                "```mermaid\nflowchart LR\n    A[Start] --> B{Decision?}\n    B -->|Yes| C[Result 1]\n    B -->|No| D[Result 2]\n```\n",
              );
            },
            className: "fa fa-sitemap",
            title: "Insert Flowchart (Mermaid)",
          },
          "|",
          "preview", "side-by-side", "fullscreen", "|",
          "guide",
        ] as const,
        uploadImage: true,
        imageUploadFunction: async (
          file: File,
          onSuccess: (url: string) => void,
          onError: (error: string) => void,
        ) => {
          try {
            const formData = new FormData();
            formData.append("file", file);
            const res = await fetch("/api/admin/upload", {
              method: "POST",
              body: formData,
              credentials: "include",
            });
            const data = await res.json();
            if (res.ok && data.url) {
              onSuccess(data.url);
            } else {
              onError(data.error || "Upload failed");
            }
          } catch (e: unknown) {
            onError(e instanceof Error ? e.message : "Upload failed");
          }
        },
      };
    }, [placeholder]);

    return (
      <div className="markdown-editor-wrapper" style={{ backgroundColor: "#fff", color: "#333", borderRadius: "8px", marginTop: "8px", width: "100%", maxWidth: "100%", overflow: "hidden" }}>
        <style>{`
        .markdown-editor-wrapper .editor-toolbar {
          display: flex;
          flex-wrap: wrap;
          box-sizing: border-box;
          max-width: 100%;
        }
        .markdown-editor-wrapper .CodeMirror {
          box-sizing: border-box;
          max-width: 100%;
          word-wrap: break-word;
          height: 400px;
        }
        .markdown-editor-wrapper .editor-toolbar button {
          color: #333 !important;
        }
        .markdown-editor-wrapper .editor-preview {
          background: #fff;
          color: #202122;
          font-family: sans-serif;
          line-height: 1.6;
          padding: 2em;
        }
        .markdown-editor-wrapper .editor-preview table {
          background-color: #f8f9fa;
          margin: 1em 0;
          border: 1px solid #a2a9b1;
          border-collapse: collapse;
          width: 100%;
        }
        .markdown-editor-wrapper .editor-preview th,
        .markdown-editor-wrapper .editor-preview td {
          border: 1px solid #a2a9b1;
          padding: 0.5em 1em;
        }
        .markdown-editor-wrapper .editor-preview th {
          background-color: #eaecf0;
          text-align: left;
          font-weight: bold;
        }
        .markdown-editor-wrapper .editor-preview pre {
          background-color: #f8f9fa;
          border: 1px solid #eaecf0;
          padding: 1em;
          overflow-x: auto;
          border-radius: 2px;
        }
        .markdown-editor-wrapper .editor-preview code {
          background-color: #f8f9fa;
          padding: 0.2em 0.4em;
          border-radius: 2px;
          font-family: monospace;
        }
      `}</style>
        <SimpleMdeReact
          value={value}
          onChange={onChange}
          options={options}
          getMdeInstance={(instance) => {
            mdeRef.current = instance;
          }}
        />
      </div>
    );
  },
);
