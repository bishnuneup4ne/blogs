"use client";

import { useState } from "react";
import Image from "next/image";
import type { Block } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { ChartBlockView } from "./ChartBlock";
import { Lightbox, type LightboxItem } from "@/components/ui/Lightbox";
import Link from "next/link";
import { VideoEmbed } from "./VideoEmbed";
import styles from "./PostContent.module.scss";
import { MediaCarousel } from "./MediaCarousel";

export function PostContent({ blocks }: { blocks: Block[] }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const images: LightboxItem[] = blocks.flatMap((b) =>
    b.type === "image"
      ? [{ src: b.src, alt: b.alt, caption: b.caption }]
      : b.type === "row"
        ? b.items.map((it) => ({ src: it.src, alt: it.alt, caption: b.caption }))
        : [],
  );

  // Position of each single image in the lightbox gallery, keyed by block index.
  const imageIndexByBlock = new Map<number, number>();
  let cursor = 0;
  blocks.forEach((b, i) => {
    if (b.type === "image") {
      imageIndexByBlock.set(i, cursor);
      cursor += 1;
    }
  });

  // Headings for the auto-generated contents block.
  const headingsSource = blocks.flatMap((b) =>
    b.type === "h2" || b.type === "h3"
      ? [{ id: b.id ?? `h-${b.text.slice(0, 16)}`, text: b.text, level: b.type === "h2" ? 2 : 3 }]
      : [],
  );

  return (
    <>
      <div className={styles.prose}>
        {(() => { let footnoteCount = 0; return blocks.map((block, index) => {
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
              const myIndex = imageIndexByBlock.get(index) ?? 0;
              const remote = /^https?:\/\//i.test(block.src) && !block.src.includes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
              return (
                <figure key={key} className={`${styles.figure}${block.width && block.width !== "full" ? ` ${styles[`fig${block.width[0].toUpperCase()}${block.width.slice(1)}`]}` : ""}`}>
                  <button
                    type="button"
                    className={styles.imageWrap}
                    onClick={() => setZoom(myIndex)}
                    aria-label={`Zoom image: ${block.alt}`}
                  >
                    {remote ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.src} alt={block.alt} loading="lazy" className={styles.image} />
                    ) : (
                      <Image
                        src={block.src}
                        alt={block.alt}
                        width={1400}
                        height={933}
                        sizes="(max-width: 760px) 100vw, 860px"
                        className={styles.image}
                      />
                    )}
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
            case "row": {
              return (
                <figure key={key} className={`${styles.figure} ${styles.rowFigure}`}>
                  <MediaCarousel
                    items={block.items.map((it) => {
                      const idx = images.findIndex((img) => img.src === it.src);
                      return { src: it.src, alt: it.alt, index: idx, video: /\.(mp4|webm)(\?|$)/i.test(it.src), size: typeof it.size === "string" ? it.size : undefined, caption: it.alt || block.caption };
                    })}
                    onOpen={(i) => setZoom(i)}
                  />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            }
            case "video":
              return <VideoEmbed key={key} url={block.url} caption={block.caption} />;
            case "related":
              return (
                <Link key={key} href={`/blog/${block.slug}`} className={styles.relatedCard}>
                  {block.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={block.image} alt={block.title} className={styles.relatedImg} loading="lazy" />
                  ) : null}
                  <span className={styles.relatedBody}>
                    <span className={styles.relatedKicker}>Read next</span>
                    <span className={styles.relatedTitle}>{block.title}</span>
                    {block.description ? <span className={styles.relatedDesc}>{block.description}</span> : null}
                  </span>
                </Link>
              );
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
            case "cta":
              return (
                <p key={key} className={styles.ctaRow}>
                  <Link
                    href={block.href}
                    className={block.style === "outline" ? `${styles.cta} ${styles.ctaOutline}` : styles.cta}
                  >
                    {block.label}
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </Link>
                  {block.note ? <span className={styles.ctaNote}>{block.note}</span> : null}
                </p>
              );
            case "footnote":
              footnoteCount += 1;
              return (
                <p key={key} className={styles.footnote} id={`fn-${key}`}>
                  <span className={styles.footnoteIndex}>{footnoteCount}</span>
                  <span>{block.text}</span>
                </p>
              );
            case "jumplinks": {
              if (headingsSource.length === 0) return null;
              return (
                <nav key={key} className={styles.jumplinks} aria-label={block.title || "In this article"}>
                  <p className={styles.jumplinksTitle}>{block.title || "In this article"}</p>
                  <ol>
                    {headingsSource.map((h) => (
                      <li key={h.id} data-level={h.level}>
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              );
            }
            case "divider":
              return <hr key={key} className={styles.divider} />;
            default:
              return null;
          }
        }); })()}
      </div>

      <Lightbox images={images} index={zoom} onClose={() => setZoom(null)} onIndexChange={setZoom} />
    </>
  );
}

function defaultTitle(tone: "note" | "tip" | "warning") {
  return tone === "note" ? "Note" : tone === "tip" ? "Tip" : "Heads up";
}
