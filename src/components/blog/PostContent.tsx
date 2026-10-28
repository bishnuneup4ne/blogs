"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Block } from "@/lib/types";
import { CodeBlock } from "./CodeBlock";
import { ChartBlockView } from "./ChartBlock";
import Link from "next/link";
import { VideoEmbed } from "./VideoEmbed";
import { EmbedBlock } from "./EmbedBlock";
import styles from "./PostContent.module.scss";
import { MediaCarousel, type CarouselSlide } from "./MediaCarousel";
import { FaqList } from "./FaqList";
import { getCategory } from "@/lib/categories";
import { routes } from "@/lib/routes";
import { SocialIcon } from "@/components/icons/Icons";

/* Map a person link's explicit icon, or guess one from its label/host. */
function personLinkIcon(link: { label?: string; href?: string; icon?: string }): string {
  const explicit = (link.icon ?? "").trim().toLowerCase();
  if (explicit) return explicit;
  const hint = `${link.label ?? ""} ${link.href ?? ""}`.toLowerCase();
  if (/github/.test(hint)) return "github";
  if (/instagram|\binsta\b/.test(hint)) return "instagram";
  if (/linkedin/.test(hint)) return "linkedin";
  if (/threads/.test(hint)) return "threads";
  if (/youtube|youtu\.be/.test(hint)) return "youtube";
  if (/facebook|fb\.com/.test(hint)) return "facebook";
  if (/twitter|x\.com/.test(hint)) return "x";
  if (/mailto:|email|e-mail/.test(hint)) return "email";
  return "website";
}

/** Block accent -> CSS var, so each block's CSS can theme itself. */
function accentStyle(block: object): React.CSSProperties | undefined {
  const b = block as { accent?: string; bg?: string; text?: string };
  const style: Record<string, string> = {};
  if (b.accent) style["--block-accent"] = b.accent;
  if (b.bg) style["--block-bg"] = b.bg;
  if (b.text) style["--block-text"] = b.text;
  return Object.keys(style).length ? (style as React.CSSProperties) : undefined;
}

/* Related-tout tints, one per topic colour chosen in the editor. */
const TOUT_COLORS = ["blue", "green", "mint", "yellow", "red", "purple", "gray"] as const;

function toutClass(color?: string) {
  if (!color || !(TOUT_COLORS as readonly string[]).includes(color)) return "";
  const key = `tout${color.charAt(0).toUpperCase()}${color.slice(1)}`;
  return styles[key] ? ` ${styles[key]}` : "";
}

/* Coverless touts take the linked post's topic pastel — same family of soft
   gradients as the card colour picker, not the saturated feed pastels. */
const TOUT_MEDIA_TINT: Record<string, string> = {
  blue: "toutBlue",
  green: "toutGreen",
  mint: "toutMint",
  yellow: "toutYellow",
  red: "toutRed",
  purple: "toutPurple",
  gray: "toutGray",
};

/* Intrinsic size of each diagram, so next/image reserves the right box. */
const DIAGRAM_SIZE: Record<string, [number, number]> = {
  "hw-block-diagram.gif": [960, 540],
  "hw-memory-storage.gif": [960, 540],
  "hw-os-layers.gif": [960, 540],
  "hw-binary-count.gif": [960, 540],
  "hw-keystroke.gif": [960, 540],
  "hw-instruction-cycle.png": [1200, 520],
};

export function PostContent({ blocks }: { blocks: Block[] }) {
  // Cover URLs can 404 before hydration (no onError fires then), so read
  // naturalWidth on mount as well and remember failures by block index.
  const [brokenCovers, setBrokenCovers] = useState<Record<string, true>>({});
  const coverBroken = (key: string, el: HTMLImageElement | null) => {
    if (!el || el.complete === false || el.naturalWidth > 0) return;
    setBrokenCovers((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  };
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
            case "quote": {
              const qv = block.variant === "big" ? styles.quoteBig : block.variant === "plain" ? styles.quotePlain : block.variant === "card" ? styles.quoteCard : block.variant === "bar" ? styles.quoteBar : "";
              const size = block.size === "sm" ? styles.quoteSm : block.size === "lg" ? styles.quoteLg : "";
              return (
                <figure
                  key={key}
                  className={`${styles.quote} ${qv} ${size}`.trim()}
                  style={{ ...accentStyle(block), ...(block.bg ? ({ ["--quote-bg" as string]: block.bg } as React.CSSProperties) : {}) }}
                >
                  <blockquote dangerouslySetInnerHTML={{ __html: block.html }} />
                  {block.cite ? <QuoteAttribution cite={block.cite} /> : null}
                </figure>
              );
            }
            case "callout":
              return (
                <aside key={key} className={`${styles.callout} ${styles[`tone-${block.tone}`]} ${block.variant ? styles[`co-${block.variant}`] : ""}`} style={accentStyle(block)}>
                  <span className={styles.calloutIcon} aria-hidden="true">{block.icon || defaultToneIcon(block.tone)}</span>
                  <div className={styles.calloutBody}>
                    <p className={styles.calloutHead}>{block.title || toneLabel(block.tone)}</p>
                    <div dangerouslySetInnerHTML={{ __html: block.html }} />
                  </div>
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
              // Empty src = a placeholder block still being built.
              if (!block.src) return null;
              // The same block also carries video: a YouTube/Vimeo link or a
              // direct MP4/WebM renders as a player instead of a photo.
              if (/\.(mp4|webm)(\?|$)/i.test(block.src) || /(?:youtube(?:-nocookie)?\.com|youtu\.be|vimeo\.com)/i.test(block.src)) {
                return <VideoEmbed key={key} url={block.src} caption={block.caption} />;
              }
              const remote = /^https?:\/\//i.test(block.src) && !block.src.includes(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "");
              return (
                <figure key={key} className={`${styles.figure}${block.width && block.width !== "full" ? ` ${styles[`fig${block.width[0].toUpperCase()}${block.width.slice(1)}`]}` : ""}`}>
                  {/* Article photos are not zoomable — the caption carries everything
                      a reader needs, and a lightbox interrupted the scroll. */}
                  <div className={block.variant === "diagram" ? `${styles.imageWrap} ${styles.imageWrapDiagram}` : styles.imageWrap}>
                    {remote ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.src} alt={block.alt} loading="lazy" className={styles.image} />
                    ) : (
                      <Image
                        src={block.src}
                        alt={block.alt}
                        /* Diagrams letterbox at their own ratio, so the declared
                           dimensions must match the file rather than assume 3:2. */
                        width={block.variant === "diagram" ? DIAGRAM_SIZE[block.src.split("/").pop() ?? ""]?.[0] ?? 1200 : 1400}
                        height={block.variant === "diagram" ? DIAGRAM_SIZE[block.src.split("/").pop() ?? ""]?.[1] ?? 520 : 933}
                        sizes="(max-width: 640px) 100vw, (max-width: 1440px) calc(100vw - 64px), 1376px"
                        className={styles.image}
                      />
                    )}
                  </div>
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            }
            case "row": {
              if (!block.items.some((it) => it.kind === "quote" || it.src)) return null;
              return (
                <figure key={key} className={`${styles.figure} ${styles.rowFigure}`}>
                  <MediaCarousel
                    slides={block.items.map((it): CarouselSlide => {
                      if (it.kind === "quote") return { kind: "quote", html: it.html, author: it.author, role: it.role };
                      return {
                        kind: "media",
                        src: it.src,
                        alt: it.alt,
                        size: it.size,
                      };
                    })}

                  />
                  {block.caption ? <figcaption>{block.caption}</figcaption> : null}
                </figure>
              );
            }
            case "video":
              if (!block.url) return null;
              return <VideoEmbed key={key} url={block.url} poster={block.poster} autoplay={block.autoplay} caption={block.caption} />;
            case "related":
              if (!block.slug) return null;
              return (
                <Link key={key} href={routes.post(block.slug)} className={`${styles.relatedTout}${toutClass(block.color)}${block.variant ? ` ${styles[`rel-${block.variant}`]}` : ""}`} style={accentStyle(block)} aria-label={`${block.eyebrow ?? "Related article"}: ${block.title}`}>
                  <span className={styles.relatedToutBody}>
                    <span className={styles.relatedToutEyebrow}>{block.eyebrow || "Related Article"}</span>
                    <span className={styles.relatedToutTitle}>{block.title}</span>
                    {block.description ? <span className={styles.relatedToutSummary}>{block.description}</span> : null}
                    <span className={styles.relatedToutCta}>
                      {block.cta || "See more"}
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </span>
                  <span className={`${styles.relatedToutMedia}${block.image && !brokenCovers[key] ? "" : ` ${styles[TOUT_MEDIA_TINT[getCategory(block.slug).pastel] ?? "toutGray"]}`}`}>
                    {block.image && !brokenCovers[key] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={block.image}
                        alt=""
                        loading="lazy"
                        className={styles.relatedToutImg}
                        ref={(el) => {
                          if (el?.complete) coverBroken(key, el);
                        }}
                        onLoad={(e) => coverBroken(key, e.currentTarget)}
                        onError={() => setBrokenCovers((prev) => ({ ...prev, [key]: true }))}
                      />
                    ) : null}
                  </span>
                </Link>
              );
            case "table":
              return (
                <div key={key} className={`${styles.tableWrap} ${block.variant ? styles[`tbl-${block.variant}`] : ""}`} style={accentStyle(block)}>
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
            case "cta": {
              if (!block.label || !block.href) return null;
              const ctaVariant = block.variant === "banner" ? styles.ctaBanner : block.variant === "link" ? styles.ctaLink : "";
              /* Internal CTAs ("next lesson", series pointers) render as the
                 same split tout used by Related Article cards. */
              const nextTarget = block.href.match(/^\/(blog|series)\/([a-z0-9-]+)/i);
              if (nextTarget && !ctaVariant) {
                const tintKey = nextTarget[1] === "blog" ? getCategory(nextTarget[2]).pastel : "blue";
                return (
                  <Link key={key} href={block.href} className={`${styles.relatedTout} ${styles.ctaAsTout}`} style={accentStyle(block)} aria-label={`${block.note || "Up next"}: ${block.label}`}>
                    <span className={styles.relatedToutBody}>
                      <span className={styles.relatedToutEyebrow}>{block.note || (nextTarget[1] === "series" ? "Part of a series" : "Next up")}</span>
                      <span className={styles.relatedToutTitle}>{block.label}</span>
                      <span className={styles.relatedToutCta}>
                        {nextTarget[1] === "series" ? "See all lessons" : "Read it"}
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    </span>
                    <span className={`${styles.relatedToutMedia} ${styles[TOUT_MEDIA_TINT[tintKey] ?? "toutGray"]}`} />
                  </Link>
                );
              }
              return (
                <div key={key} className={`${styles.ctaRow} ${ctaVariant}`.trim()} style={accentStyle(block)}>
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
                </div>
              );
            }
            case "footnote":
              if (!block.text) return null;
              footnoteCount += 1;
              return (
                <p key={key} className={styles.footnote} id={`fn-${key}`}>
                  <span className={styles.footnoteIndex}>{footnoteCount}</span>
                  <span>{block.text}</span>
                </p>
              );
            case "imgtext": {
              if (!block.src || !block.html) return null;
              return (
                <div key={key} className={`${styles.imgText} ${block.side === "right" ? styles.imgTextRight : ""}`} data-side={block.side ?? "left"} style={accentStyle(block)}>
                  <figure className={styles.imgTextFig}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={block.src} alt={block.alt} loading="lazy" />
                  </figure>
                  <div className={styles.imgTextBody} dangerouslySetInnerHTML={{ __html: block.html }} />
                </div>
              );
            }
            case "embed": {
              const frame = embedFrame(block.url);
              if (!frame) return null;
              return <EmbedBlock key={key} url={block.url} html={frame.html} kind={frame.kind} caption={block.caption} />;
            }
            case "keypoints": {
              const items = block.items.filter(Boolean);
              if (items.length === 0) return null;
              return (
                <section key={key} className={`${styles.summaryCard} ${block.variant ? styles[`kp-${block.variant}`] : ""}`} style={accentStyle(block)} aria-label={block.title || "Key takeaways"}>
                  <span className={styles.summaryPill} aria-hidden="true">
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 12.5 4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <div className={styles.summaryMain}>
                    <h2 className={styles.summaryTitle}>{block.title || "Key takeaways"}</h2>
                    <ul className={styles.summaryList}>
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              );
            }
            case "stats": {
              const items = block.items.filter((s) => s.value || s.label);
              if (items.length === 0) return null;
              return (
                <aside key={key} className={`${styles.statsRow} ${block.variant ? styles[`st-${block.variant}`] : ""}`} style={{ ...accentStyle(block), "--stats-cols": Math.min(4, Math.max(2, items.length)) } as React.CSSProperties} aria-label="Key figures">
                  {items.map((s, i) => (
                    <div key={i} className={styles.statCell}>
                      <strong>{s.value}</strong>
                      <span>{s.label}</span>
                      {s.note ? <em>{s.note}</em> : null}
                    </div>
                  ))}
                </aside>
              );
            }
            case "timestrip": {
              const items = block.items.filter((t) => t.date || t.title);
              if (items.length === 0) return null;
              return (
                <section key={key} className={styles.blockShell} aria-label={block.title || "Timeline"}>
                  {block.title ? <h2 className={styles.blockHeading}>{block.title}</h2> : null}
                  <div className={`${styles.timeStrip} ${block.variant ? styles[`ts-${block.variant}`] : ""}`}>
                  <ol>
                    {items.map((t, i) => (
                      <li key={i}>
                        <span className={styles.timeStripDot} aria-hidden="true" />
                        <strong>{t.date}</strong>
                        <span className={styles.timeStripTitle}>{t.title}</span>
                        {t.detail ? <span className={styles.timeStripDetail}>{t.detail}</span> : null}
                      </li>
                    ))}
                  </ol>
                  </div>
                </section>
              );
            }
            case "bafter": {
              if (!block.before || !block.after) return null;
              return <BeforeAfter key={key} before={block.before} after={block.after} labelBefore={block.labelBefore} labelAfter={block.labelAfter} alt={block.alt} />;
            }
            case "accordion": {
              const items = block.items.filter((i) => i.q);
              if (items.length === 0) return null;
              return (
                <div key={key} style={accentStyle(block)}>
                  <FaqList items={items} variant={block.variant} title={block.title} />
                </div>
              );
            }
            case "proscons": {
              const pros = block.pros.filter(Boolean);
              const cons = block.cons.filter(Boolean);
              if (pros.length === 0 && cons.length === 0) return null;
              return (
                <div key={key} className={`${styles.prosCons} ${block.variant ? styles[`pc-${block.variant}`] : ""}`} style={accentStyle(block)}>
                  {pros.length ? (
                    <section className={styles.prosCol} data-side="pros">
                      <p className={styles.prosLabel}>{block.prosLabel || "Worth it"}</p>
                      <ul>{pros.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}</ul>
                    </section>
                  ) : null}
                  {cons.length ? (
                    <section className={styles.prosCol} data-side="cons">
                      <p className={styles.prosLabel}>{block.consLabel || "Trade-offs"}</p>
                      <ul>{cons.map((item, i) => <li key={i} dangerouslySetInnerHTML={{ __html: item }} />)}</ul>
                    </section>
                  ) : null}
                </div>
              );
            }
            case "steps": {
              const items = block.items.filter((i) => i.title);
              if (items.length === 0) return null;
              return (
                <div key={key} className={`${styles.steps} ${block.variant ? styles[`st-${block.variant}`] : ""}`} style={accentStyle(block)} aria-label={block.title || "Steps"}>
                  {block.title ? <p className={styles.blockKicker}>{block.title}</p> : null}
                  <ol>
                    {items.map((item, i) => (
                      <li key={i}>
                        <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
                        <div>
                          <strong>{item.title}</strong>
                          {item.detail ? <span className={styles.stepDetail}>{item.detail}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            }
            case "glossary": {
              const terms = block.terms.filter((t) => t.term && t.def);
              if (terms.length === 0) return null;
              const groups = new Map<string, { term: string; def: string }[]>();
              for (const t of [...terms].sort((a, b) => a.term.localeCompare(b.term))) {
                const letter = (t.term.trim()[0] || "#").toUpperCase();
                if (!groups.has(letter)) groups.set(letter, []);
                groups.get(letter)!.push(t);
              }
              return (
                <section key={key} className={`${styles.glossaryBlock} ${block.variant ? styles[`gl-${block.variant}`] : ""}`} style={accentStyle(block)} aria-label={block.title || "Glossary"}>
                  <h2 className={styles.glossaryTitle}>{block.title?.trim() || "Glossary"}</h2>
                  <div className={styles.glossaryGrid}>
                    {[...groups.entries()].map(([letter, items]) => (
                      <div key={letter} className={styles.glossaryGroup}>
                        <p className={styles.glossaryLetter}>{letter}</p>
                        {items.map((t, i) => (
                          <dl key={i} className={styles.glossaryEntry}>
                            <dt>{t.term}</dt>
                            <dd>{t.def}</dd>
                          </dl>
                        ))}
                      </div>
                    ))}
                  </div>
                </section>
              );
            }
            case "diff": {
              const before = block.before.split("\n");
              const after = block.after.split("\n");
              if (!block.before.trim() && !block.after.trim()) return null;
              return (
                <section key={key} className={`${styles.compare} ${block.variant ? styles[`df-${block.variant}`] : ""}`} aria-label={block.filename || "Before and after"}>
                  <h2 className={styles.compareTitle}>{block.filename?.trim() || "Before and after"}</h2>
                  <p className={styles.compareSub}>The old version on the left, the new one on the right.</p>
                  <div className={styles.compareGrid}>
                    <div className={styles.comparePane} data-side="before">
                      <p className={styles.compareLabel}>Before</p>
                      <pre><code>{before.map((line, i) => <span key={i} data-line>{line || " "}</span>)}</code></pre>
                    </div>
                    <span className={styles.compareOr} aria-hidden="true">OR</span>
                    <div className={styles.comparePane} data-side="after">
                      <p className={styles.compareLabel}>After</p>
                      <pre><code>{after.map((line, i) => <span key={i} data-line>{line || " "}</span>)}</code></pre>
                    </div>
                  </div>
                </section>
              );
            }
            case "person": {
              if (!block.name?.trim()) return null;
              const initials = block.name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("");
              const links = (block.links ?? []).filter((l) => l.href);
              return (
                <section key={key} className={`${styles.personCard} ${block.variant ? styles[`pr-${block.variant}`] : ""}`} style={accentStyle(block)} aria-label={block.name}>
                  <span className={styles.personAvatar} aria-hidden="true">
                    {block.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={block.avatar} alt="" className={styles.personAvatarImg} />
                    ) : (
                      initials
                    )}
                  </span>
                  <div className={styles.personBody}>
                    <p className={styles.personName}>{block.name}</p>
                    {block.role ? <p className={styles.personRole}>{block.role}</p> : null}
                    {block.html ? <div className={styles.personBio} dangerouslySetInnerHTML={{ __html: block.html }} /> : null}
                    {links.length ? (
                      <ul className={styles.personLinks}>
                        {links.map((l, i) => (
                          <li key={i}>
                            <a className={styles.personLink} href={l.href} rel="noreferrer noopener" target="_blank">
                              <SocialIcon name={personLinkIcon(l)} width={15} height={15} aria-hidden="true" />
                              <span>{l.label}</span>
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </section>
              );
            }
            case "progress": {
              const max = block.max && block.max > 0 ? block.max : 100;
              const pct = Math.max(0, Math.min(100, (block.value / max) * 100));
              return (
                <div key={key} className={`${styles.progressBlock} ${block.variant ? styles[`pg-${block.variant}`] : ""}`}aria-label={block.label || "Progress"} style={{ ...accentStyle(block), ["--pg-pct" as string]: `${pct}%`, ["--pg-color" as string]: block.color ?? "" } as React.CSSProperties}>
                  <div className={styles.progressTop}>
                    <p className={styles.progressLabel}>{block.label || "Progress"}</p>
                    <span className={styles.progressValue}>
                      {block.value}{block.unit ? block.unit : ""}
                      <span className={styles.progressUnit}> / {max}{block.unit ? block.unit : ""}</span>
                    </span>
                  </div>
                  <div className={styles.progressTrack} role="progressbar" aria-valuenow={block.value} aria-valuemin={0} aria-valuemax={max}>
                    <span className={styles.progressFill} style={{ width: `${pct}%` }} />
                  </div>
                  {block.note ? <p className={styles.progressNote}>{block.note}</p> : null}
                </div>
              );
            }
            case "linkcards": {
              const items = block.items.filter((i) => i.title && i.href);
              if (!items.length) return null;
              return (
                <nav key={key} className={`${styles.linkCards} ${block.variant ? styles[`lc-${block.variant}`] : ""}`} style={accentStyle(block)} aria-label={block.title || "Links"}>
                  {block.title ? <p className={styles.linkCardsTitle}>{block.title}</p> : null}
                  <ul className={styles.linkCardsGrid}>
                    {items.map((c, i) => (
                      <li key={i}>
                        <a className={styles.linkCard} href={c.href} rel="noreferrer noopener" target="_blank">
                          <span className={styles.linkCardTitle}>{c.title}<ArrowGlyph /></span>
                          {c.desc ? <span className={styles.linkCardDesc}>{c.desc}</span> : null}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              );
            }
            case "compare": {
              const rows = block.rows.filter((r) => r.feature || r.a || r.b);
              if (!rows.length) return null;
              return (
                <div key={key} className={`${styles.cmpWrap} ${block.variant ? styles[`cp-${block.variant}`] : ""}`} role="table" aria-label="Comparison" style={accentStyle(block)}>
                  <div className={`${styles.cmpRow} ${styles.cmpHead}`} role="row">
                    <span role="columnheader" />
                    <span role="columnheader">{block.columns[0]}</span>
                    <span role="columnheader">{block.columns[1]}</span>
                  </div>
                  {rows.map((r, i) => (
                    <div key={i} className={styles.cmpRow} role="row">
                      <span role="rowheader">{r.feature}</span>
                      <span className={styles.cmpCell} role="cell"><CompareMark v={r.a} /></span>
                      <span className={styles.cmpCell} role="cell"><CompareMark v={r.b} /></span>
                    </div>
                  ))}
                </div>
              );
            }
            case "countdown":
              return <Countdown key={key} date={block.date} label={block.label} note={block.note} variant={block.variant} style={accentStyle(block)} />;
            case "divider":
              return <hr key={key} className={styles.divider} />;
            default:
              return null;
          }
        }); })()}

      </div>

    </>
  );
}

/* ✓ / ✗ or free text in a comparison cell. */
function CompareMark({ v }: { v: string }) {
  const t = v.trim().toLowerCase();
  if (t === "yes" || t === "y" || t === "true" || t === "✓" || t === "+" || t === "on") return <span className={styles.cmpYes} aria-label="Yes">✓</span>;
  if (t === "no" || t === "n" || t === "false" || t === "✗" || t === "−" || t === "-" || t === "off") return <span className={styles.cmpNo} aria-label="No">✕</span>;
  return <span>{v}</span>;
}

const ArrowGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginLeft: "auto", flex: "none" }}>
    <path d="M7 17 17 7M9 7h8v8" />
  </svg>
);

function defaultToneIcon(tone: "note" | "tip" | "warning" | "info"): string {
  return tone === "tip" ? "💡" : tone === "warning" ? "⚠️" : tone === "info" ? "ℹ️" : "📌";
}

function toneLabel(tone: "note" | "tip" | "warning" | "info"): string {
  return tone === "tip" ? "Tip" : tone === "warning" ? "Heads up" : tone === "info" ? "Good to know" : "Note";
}

/* Live countdown to a future date; falls back to the note once passed. */
function Countdown({ date, label, note, variant, style }: { date: string; label?: string; note?: string; variant?: "grid" | "inline"; style?: React.CSSProperties }) {
  const target = Date.parse(date);
  // Null until mount: Date.now() during render differs between the server and
  // the browser, which React reports as a hydration mismatch (error #418).
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (Number.isNaN(target)) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [target]);
  if (Number.isNaN(target)) return null;
  // Server + first client paint render the same stable placeholder.
  if (now === null) {
    return (
      <div className={styles.countdown} data-variant={variant ?? "grid"} style={style} aria-hidden="true">
        {label ? <p className={styles.countdownLabel}>{label}</p> : null}
        {note ? <p className={styles.countdownNote}>{note}</p> : null}
      </div>
    );
  }
  const diff = target - now;
  if (diff <= 0) {
    return (
      <div className={styles.countdown} data-variant={variant ?? "grid"} style={style}>
        <p className={styles.countdownLabel}>{label || "It's here."}</p>
        {note ? <p className={styles.countdownNote}>{note}</p> : null}
      </div>
    );
  }
  const s = Math.floor(diff / 1000);
  const units = [
    { n: Math.floor(s / 86400), l: "days" },
    { n: Math.floor((s % 86400) / 3600), l: "hours" },
    { n: Math.floor((s % 3600) / 60), l: "minutes" },
    { n: s % 60, l: "seconds" },
  ];
  return (
    <div className={styles.countdown} style={style}>
      {label ? <p className={styles.countdownLabel}>{label}</p> : null}
      <div className={styles.countdownGrid} data-variant={variant ?? "grid"}>
        {units.map((u) => (
          <div key={u.l} className={styles.countdownCell}>
            <strong>{String(u.n).padStart(2, "0")}</strong>
            <span>{u.l}</span>
          </div>
        ))}
      </div>
      {note ? <p className={styles.countdownNote}>{note}</p> : null}
    </div>
  );
}

/* Draggable before/after comparison. The range input keeps it keyboard- and
   touch-accessible; the handle follows its value. */
function BeforeAfter({ before, after, labelBefore, labelAfter, alt }: { before: string; after: string; labelBefore?: string; labelAfter?: string; alt?: string }) {
  const [pos, setPos] = useState(50);
  return (
    <figure className={styles.baFrame}>
      <div className={styles.baImages} style={{ "--ba-pos": `${pos}%` } as React.CSSProperties}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.baAfter} src={after} alt={alt ?? "After"} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.baBefore} src={before} alt={alt ? `${alt} — before` : "Before"} />
        <span className={styles.baHandle} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l-4 6 4 6M15 6l4 6-4 6" />
          </svg>
        </span>
        {labelBefore ? <span className={styles.baTagLeft}>{labelBefore}</span> : null}
        {labelAfter ? <span className={styles.baTagRight}>{labelAfter}</span> : null}
        <input
          className={styles.baRange}
          type="range"
          min={0}
          max={100}
          value={pos}
          aria-label="Compare before and after"
          onChange={(e) => setPos(Number(e.target.value))}
        />
      </div>
    </figure>
  );
}

type EmbedKind = "iframe" | "instagram" | "twitter" | "tiktok" | "threads" | "gist";

interface EmbedFrameResult {
  kind: EmbedKind;
  html: string;
}

/**
 * Pull a canonical URL out of pasted embed code (a blockquote/script snippet,
 * an iframe src, etc). Returns null when there is no instagram/x/tiktok link,
 * which is what makes pasting full embed code work in an embed block.
 */
function extractEmbedUrl(raw: string): string | null {
  const m = raw.match(/https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am|x\.com|twitter\.com|threads\.(?:net|com)|tiktok\.com)\/[^\s"'<>\\]+/i);
  if (!m) return null;
  let url: URL;
  try {
    url = new URL(m[0]);
  } catch {
    return null;
  }
  // Instagram's own embed iframe (/username/embed/) encodes the profile or
  // post inside its src, not as a normal page URL.
  const host0 = url.hostname.replace(/^www\./, "");
  if (host0 === "instagram.com") {
    const embPost = url.pathname.match(/^\/(?:p|reel|tv)\/([\w-]+)\/embed\/?$/);
    if (embPost) return `https://www.instagram.com/p/${embPost[1]}/`;
    const embProfile = url.pathname.match(/^\/([\w.][\w.-]*)\/embed\/?$/);
    if (embProfile && !/^(_|explore|accounts|api|developer|about)$/.test(embProfile[1])) return `https://www.instagram.com/${embProfile[1]}/`;
  }
  const host = url.hostname.replace(/^www\./, "");
  if (host === "instagram.com" || host === "instagr.am") {
    const post = url.pathname.match(/^\/(?:p|reel|tv)\/([\w-]+)/);
    if (post) return `https://www.instagram.com/p/${post[1]}/`;
    const profile = url.pathname.match(/^\/([\w.][\w.-]*)\/?$/);
    if (profile && !/^(_|explore|accounts|api|developer|about)$/.test(profile[1])) return `https://www.instagram.com/${profile[1]}/`;
    return null;
  }
  if (host === "x.com" || host === "twitter.com") {
    const id = url.pathname.match(/\/status(?:\/\d+)?(\d+)/)?.[1] ?? url.searchParams.get("id");
    return id ? `https://x.com/i/status/${id}` : null;
  }
  if (host === "threads.net" || host === "threads.com") {
    return url.pathname.includes("/post/") ? `${url.origin}${url.pathname}` : null;
  }
  if (host === "tiktok.com") {
    return url.pathname.includes("/video/") ? `${url.origin}${url.pathname}` : null;
  }
  return null;
}

/**
 * Turn a pasted embed URL — or pasted embed code — into safe HTML for the
 * renderers we support. Unknown hosts fall back to a link card, so an embed
 * block is never "invalid".
 */
function embedFrame(url: string): EmbedFrameResult | null {
  if (!url) return null;
  const looksLikeCode = /<[a-z]/i.test(url);
  const candidate = looksLikeCode ? extractEmbedUrl(url) : null;
  const target = candidate ?? url.trim();
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "");
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  const frame = (kind: EmbedKind, html: string): EmbedFrameResult => ({ kind, html });
  const card = (label: string) => frame("iframe", embedLinkCard(target, label));
  // Instagram's own embed iframe URL (/username/embed/) — resolve it to the
  // canonical profile/post so the blockquote renderer picks it up.
  if (host === "instagram.com" || host === "instagr.am") {
    const embPost = u.pathname.match(/^\/(?:p|reel|tv)\/([\w-]+)\/embed\/?$/);
    if (embPost) return frame("instagram", `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/${encodeURIComponent(embPost[1])}/" data-instgrm-version="14"><a href="https://www.instagram.com/p/${encodeURIComponent(embPost[1])}/" target="_blank" rel="noopener noreferrer">View this post on Instagram</a></blockquote>`);
    const embProfile = u.pathname.match(/^\/([\w.][\w.-]*)\/embed\/?$/);
    if (embProfile && !/^(_|explore|accounts|api|developer|about)$/.test(embProfile[1])) return frame("instagram", `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/${encodeURIComponent(embProfile[1])}/" data-instgrm-version="14"><a href="https://www.instagram.com/${encodeURIComponent(embProfile[1])}/" target="_blank" rel="noopener noreferrer">View this profile on Instagram</a></blockquote>`);
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.pathname.startsWith("/embed/") ? u.pathname.slice(7) : u.searchParams.get("v");
    if (!id) return null;
    return frame("iframe", `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(id)}" title="Embedded video" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>`);
  }
  if (host === "youtu.be") {
    const id = u.pathname.slice(1);
    return id ? frame("iframe", `<iframe src="https://www.youtube.com/embed/${encodeURIComponent(id)}" title="Embedded video" loading="lazy" allowfullscreen></iframe>`) : null;
  }
  if (host === "vimeo.com") {
    const id = u.pathname.slice(1).split("/")[0];
    if (!/^\d+$/.test(id)) return null;
    return frame("iframe", `<iframe src="https://player.vimeo.com/video/${id}" title="Embedded video" loading="lazy" allowfullscreen></iframe>`);
  }
  if (host === "open.spotify.com" && u.pathname.startsWith("/embed/")) {
    return frame("iframe", `<iframe src="${u.toString()}" title="Spotify player" loading="lazy" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>`);
  }
  if (host === "codepen.io") {
    const parts = u.pathname.split("/").filter(Boolean); // /user/pen/ID
    if (parts[1] !== "pen" || !parts[2]) return null;
    return frame("iframe", `<iframe src="https://codepen.io/${parts[0]}/embed/${parts[2]}?default-tab=result" title="CodePen embed" loading="lazy" allowfullscreen></iframe>`);
  }
  if (host === "w.soundcloud.com" || host === "soundcloud.com") {
    const src = host.startsWith("w.") ? target : `https://w.soundcloud.com/player/?url=${encodeURIComponent(target)}`;
    return frame("iframe", `<iframe src="${src}" title="SoundCloud player" loading="lazy" allow="autoplay"></iframe>`);
  }
  if (host === "google.com" || host === "maps.google.com" || (host === "www.google.com" && u.pathname.startsWith("/maps"))) {
    return frame("iframe", `<iframe src="https://maps.google.com/maps?q=${encodeURIComponent(u.searchParams.get("q") ?? "")}&output=embed" title="Google Maps embed" loading="lazy"></iframe>`);
  }
  if (host === "docs.google.com") {
    return frame("iframe", `<iframe src="${target}" title="Google Docs embed" loading="lazy"></iframe>`);
  }
  if (host === "gist.github.com") {
    return frame("gist", "");
  }
  if (host === "github.com" || host === "githubassets.com") {
    // Gists render via script above; repo links become a styled card.
    return card("GitHub");
  }
  if (host === "instagram.com" || host === "instagr.am") {
    const m = u.pathname.match(/\/(?:p|reel|tv)\/([\w-]+)/);
    if (m) return frame("instagram", `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/p/${encodeURIComponent(m[1])}/" data-instgrm-version="14"><a href="https://www.instagram.com/p/${encodeURIComponent(m[1])}/" target="_blank" rel="noopener noreferrer">View this post on Instagram</a></blockquote>`);
    const profile = u.pathname.match(/^\/([\w.][\w.-]*)\/?$/);
    if (profile && !/^(_|explore|accounts|api|developer|about)$/.test(profile[1])) {
      return frame("instagram", `<blockquote class="instagram-media" data-instgrm-permalink="https://www.instagram.com/${encodeURIComponent(profile[1])}/" data-instgrm-version="14"><a href="https://www.instagram.com/${encodeURIComponent(profile[1])}/" target="_blank" rel="noopener noreferrer">View this profile on Instagram</a></blockquote>`);
    }
    return card("Instagram");
  }
  if (host === "x.com" || host === "twitter.com") {
    const m = u.pathname.match(/\/status\/(\d+)/);
    const id = m ? m[1] : u.searchParams.get("id");
    if (id) return frame("twitter", `<blockquote class="twitter-tweet"><a href="https://twitter.com/i/status/${encodeURIComponent(id)}"></a></blockquote>`);
    return card("X");
  }
  if (host === "threads.net" || host === "threads.com") {
    const m = u.pathname.match(/\/post\/([\w-]+)/);
    if (m) return frame("threads", `<div><iframe src="https://threads.net/embed?href=${encodeURIComponent(target.split("?")[0])}" title="Threads post" loading="lazy" style="border:0;width:100%;min-height:320px"></iframe></div>`);
    return card("Threads");
  }
  if (host === "tiktok.com") {
    const m = u.pathname.match(/\/video\/(\d+)/);
    if (m) return frame("tiktok", `<blockquote class="tiktok-embed"><a href="${esc(target.split("?")[0])}" target="_blank" rel="noopener noreferrer">View this TikTok on TikTok</a></blockquote>`);
    return card("TikTok");
  }
  if (host === "facebook.com" || host === "fb.watch") {
    return frame("iframe", `<iframe src="https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(target.split("?")[0])}&show_text=true&width=500" title="Facebook post" loading="lazy" style="border:none;overflow:hidden;width:100%;max-width:540px;height:420px" scrolling="no" frameborder="0" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>`);
  }
  if (host === "medium.com" || host.endsWith(".medium.com")) {
    return card("Medium");
  }
  if (host === "discord.com" && u.pathname.startsWith("/channels/")) {
    return frame("iframe", `<iframe src="${esc(target.replace(/^https:\/\/discord\.com\/channels\//, "https://discord.com/widget?id=").replace(/\//g, "-"))}" title="Discord message" loading="lazy" style="border:0;width:100%;min-height:400px"></iframe>`);
  }
  if (host === "canva.com") {
    const m = u.pathname.match(/\/design\/([\w-]+)/);
    if (m) return frame("iframe", `<iframe src="https://www.canva.com/design/${encodeURIComponent(m[1])}/view?embed" title="Canva design" loading="lazy" style="border:0;width:100%;aspect-ratio:16/9"></iframe>`);
  }
  if (host === "figma.com") {
    return frame("iframe", `<iframe src="${esc(u.origin + "/embed" + u.pathname + "?embed_key=embed")}" title="Figma file" loading="lazy" style="border:0;width:100%;aspect-ratio:16/10"></iframe>`);
  }
  if (host === "notion.so" || host === "notion.site") {
    return frame("iframe", `<iframe src="${esc(target.split("?")[0])}" title="Notion page" loading="lazy" style="border:0;width:100%;min-height:500px"></iframe>`);
  }
  if (host === "linkedin.com") {
    return card("LinkedIn");
  }
  // Anything else still renders as a clean link card — never an invalid block.
  return card(u.hostname || "Link");
}

/** Fallback presentation for hosts without a real embed API. */
function embedLinkCard(url: string, label: string): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<a class="embed-link-card" href="${esc(url)}" target="_blank" rel="noopener noreferrer nofollow"><span class="embed-link-label">${esc(label)}</span><span class="embed-link-host">${esc(new URL(url).hostname)}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>`;
}

/* Quote credit, blog.google style: "By Name" on one line and the role under
   it. Accepts "Name, Role", "Name — Role", or "Name|Role" in the cite field. */
function QuoteAttribution({ cite }: { cite: string }) {
  const value = cite.trim();
  const split = value.split(/\s*(?:\||—|–|,\s)\s*/, 2);
  const name = split[0]?.trim() || value;
  const role = split[1]?.trim();
  return (
    <figcaption className={styles.quoteBy}>
      <span className={styles.quoteByName}>By {name}</span>
      {role ? <span className={styles.quoteByRole}>{role}</span> : null}
    </figcaption>
  );
}
