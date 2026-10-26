"use client";

import { useState } from "react";
import Image from "next/image";
import type { Block } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { ChartBlockView } from "./ChartBlock";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import styles from "./PostContent.module.scss";

export function PostContent({ blocks }: { blocks: Block[] }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const images: LightboxItem[] = blocks
    .filter((b): b is Extract<Block, { type: "image" }> => b.type === "image")
    .map((b) => ({ src: b.src, alt: b.alt, caption: b.caption }));

  let imageIndex = -1;

  return (
    <>
      <div className={styles.prose}>
        {blocks.map((block, index) => {
          const key = `${block.type}-${index}`;
          switch (block.type) {
            case "p":
              return <p key={key} dangerouslySetInnerHTML={{ __html: block.html }} />;
            case "h2":
              return (
                <h2 key={key} id={block.id}>
                  <a href={`#${block.id}`} className={styles.anchor} tabIndex={-1}>
                    {block.text}
                  </a>
                </h2>
              );
            case "h3":
              return (
                <h3 key={key} id={block.id}>
                  <a href={`#${block.id}`} className={styles.anchor} tabIndex={-1}>
                    {block.text}
                  </a>
                </h3>
              );
            case "quote":
              return (
                <figure key={key} className={styles.quote}>
                  <blockquote dangerouslySetInnerHTML={{ __html: block.html }} />
                  {block.cite ? <figcaption>{block.cite}</figcaption> : null}
                </figure>
              );
            case "callout":
              return (
                <aside key={key} className={`${styles.callout} ${styles[block.tone]}`}>
                  <div className={styles.calloutHead}>{block.title || defaultTitle(block.tone)}</div>
                  <div className={styles.calloutBody} dangerouslySetInnerHTML={{ __html: block.html }} />
                </aside>
              );
            case "code":
              return <CodeBlock key={key} code={block.code} lang={block.lang} filename={block.filename} />;
            case "list":
              return block.ordered ? (
                <ol key={key}>
                  {block.items.map((item, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ol>
              ) : (
                <ul key={key}>
                  {block.items.map((item, i) => (
                    <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
                  ))}
                </ul>
              );
            case "image": {
              imageIndex += 1;
              const myIndex = imageIndex;
              return (
                <figure key={key} className={styles.figure}>
                  <button
                    type="button"
                    className={styles.imageWrap}
                    onClick={() => setZoom(myIndex)}
                    aria-label={`Zoom image: ${block.alt}`}
                  >
                    <Image
                      src={block.src}
                      alt={block.alt}
                      width={1400}
                      height={933}
                      sizes="(max-width: 760px) 100vw, 860px"
                      className={styles.image}
                    />
                    <span className={styles.zoomHint} aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-4-4M11 8v6M8 11h6" />
                      </svg>
                    </span>
                  </button>
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            }
            case "table":
              return (
                <div key={key} className={styles.tableWrap}>
                  <table>
                    <thead>
                      <tr>
                        {block.head.map((h, i) => (
                          <th key={i}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {block.rows.map((row, r) => (
                        <tr key={r}>
                          {row.map((cell, c) => (
                            <td key={c}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "chart":
              return <ChartBlockView key={key} chart={block.chart} />;
            case "divider":
              return <hr key={key} className={styles.divider} />;
            default:
              return null;
          }
        })}
      </div>

      <Lightbox images={images} index={zoom} onClose={() => setZoom(null)} onIndexChange={setZoom} />
    </>
  );
}

function defaultTitle(tone: "note" | "tip" | "warning") {
  return tone === "note" ? "Note" : tone === "tip" ? "Tip" : "Heads up";
}
