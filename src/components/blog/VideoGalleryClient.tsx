"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { normalizeImageUrl } from "@/lib/normalizeImageUrl";
import { VideoEmbed } from "./VideoEmbed";
import { VideoPanelBody } from "./VideoPanelBody";
import styles from "./VideoList.module.scss";

export type VideoGalleryItem = {
  slug: string;
  title: string;
  date: string;
  summary: string;
  content: string;
  videoUrl: string;
  image: string;
  category: string;
  tags: string[];
  index: number;
};

function getExternalHref(url: string) {
  try {
    return new URL(url.trim()).toString();
  } catch {
    return "#";
  }
}

function getThumb(url: string) {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname.includes("youtube.com") || parsed.hostname === "youtu.be") {
      const id =
        parsed.searchParams.get("v") ||
        (parsed.hostname === "youtu.be"
          ? parsed.pathname.replace(/^\//, "").split("/")[0]
          : "");
      if (id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
    }
  } catch {
    return "";
  }
  return "";
}

export function VideoGalleryClient({ items }: { items: VideoGalleryItem[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const active = useMemo(
    () => items.find((item) => item.slug === activeSlug) || null,
    [activeSlug, items],
  );

  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActiveSlug(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  const activeImage = active?.image ? normalizeImageUrl(active.image) : "";
  const hasSummary = Boolean(active?.summary?.trim());
  const hasContent = Boolean(active?.content?.trim());
  const hasMeta = Boolean(active?.category || active?.tags?.length);

  return (
    <>
      <ul className={styles.grid} aria-label="Personal videos">
        {items.map((item) => {
          const thumb = getThumb(item.videoUrl) || (item.image ? normalizeImageUrl(item.image) : "");
          return (
            <li key={item.slug} className={styles.card}>
              <button
                type="button"
                className={styles.trigger}
                onClick={() => setActiveSlug(item.slug)}
                aria-label={`Play ${item.title}`}
              >
                <div className={styles.thumbWrap}>
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={thumb} alt="" className={styles.thumb} loading="lazy" />
                  ) : (
                    <div className={styles.thumbFallback}>
                      <span className={styles.playTriangle} aria-hidden />
                    </div>
                  )}
                  <span className={styles.playBadge} aria-hidden>
                    <span className={styles.playBadgeCircle}>
                      <span className={styles.playTriangle} />
                    </span>
                  </span>
                </div>
                <div className={styles.meta}>
                  <span className={styles.index}>{String(item.index).padStart(2, "0")}</span>
                  <h2 className={styles.videoTitle}>{item.title}</h2>
                  {item.summary ? (
                    <p className={styles.cardSummary}>{item.summary}</p>
                  ) : null}
                  <time className={styles.date}>{item.date}</time>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setActiveSlug(null)}
        >
          <div className={styles.panel} onClick={(event) => event.stopPropagation()}>
            <header className={styles.panelTop}>
              <div className={styles.panelTopText}>
                {active.category ? (
                  <span className={styles.panelBadge}>{active.category}</span>
                ) : null}
                <h3 className={styles.panelTitle}>{active.title}</h3>
                <p className={styles.panelDate}>{active.date}</p>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={() => setActiveSlug(null)}
                aria-label="Close"
              >
                <span className={styles.closeIcon} aria-hidden />
              </button>
            </header>

            <div className={styles.panelBody}>
              <div className={styles.panelMain}>
                <div className={styles.playerShell}>
                  <VideoEmbed url={active.videoUrl} title={active.title} />
                </div>

                <div className={styles.panelToolbar}>
                  <a
                    className={styles.toolbarBtn}
                    href={getExternalHref(active.videoUrl)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open on YouTube / Vimeo
                  </a>
                  {(hasContent || hasSummary) && (
                    <Link className={styles.toolbarBtnGhost} href={`/blogs/${active.slug}`}>
                      Full writeup
                    </Link>
                  )}
                </div>
              </div>

              {(hasSummary || hasContent || hasMeta || activeImage) && (
                <aside className={styles.panelAside}>
                  {activeImage ? (
                    <div className={styles.panelCover}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeImage} alt="" className={styles.panelCoverImg} />
                    </div>
                  ) : null}

                  {hasSummary && (
                    <section className={styles.panelSection}>
                      <h4 className={styles.panelSectionTitle}>About</h4>
                      <p className={styles.summary}>{active.summary}</p>
                    </section>
                  )}

                  {hasMeta && (
                    <section className={styles.panelSection}>
                      <h4 className={styles.panelSectionTitle}>Details</h4>
                      {active.category ? (
                        <p className={styles.panelMetaRow}>
                          <span className={styles.panelMetaLabel}>Category</span>
                          <span>{active.category}</span>
                        </p>
                      ) : null}
                      {active.tags?.length ? (
                        <ul className={styles.tagList}>
                          {active.tags.map((tag) => (
                            <li key={tag} className={styles.tag}>
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </section>
                  )}

                  {hasContent && <VideoPanelBody content={active.content} />}
                </aside>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
