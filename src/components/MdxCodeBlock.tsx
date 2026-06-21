"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import { CodeBlock } from "@once-ui-system/core";

type CodeBlockProps = ComponentProps<typeof CodeBlock>;

function CodeBlockFallback() {
  return (
    <pre
      style={{
        margin: "8px 0 16px",
        padding: "16px",
        borderRadius: "12px",
        overflow: "auto",
        fontSize: "13px",
        lineHeight: 1.5,
        minHeight: "4rem",
      }}
      aria-hidden
    />
  );
}

const CodeBlockClient = dynamic(
  () => import("@once-ui-system/core").then((mod) => mod.CodeBlock),
  { ssr: false, loading: () => <CodeBlockFallback /> },
);

/** Once UI CodeBlock can mismatch on hydration; render after mount. */
export function MdxCodeBlock(props: CodeBlockProps) {
  return <CodeBlockClient {...props} />;
}
