"use client";

import { useState } from "react";
import { detectExternalVideo } from "@/lib/external-video";
import styles from "./VideoEmbed.module.scss";

/* Renders a poster with a custom play button. The YouTube/Vimeo iframe — and
   with it every piece of their chrome (title, channel, logo) — only mounts
   once the reader actually presses play. */
export function VideoEmbed({ url, caption }: { url: string; caption?: string }) {
  const external = detectExternalVideo(url);
  const [playing, setPlaying] = useState(false);

  if (!external) {
    return (
      <figure className={styles.figure}>
        <video src={url} controls playsInline preload="metadata" className={styles.file} />
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (playing) {
    // Autoplay + rel=0 + modestbranding keeps the player as plain as the
    // provider allows once the reader has opted in.
    const src = `${external.embedUrl}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    return (
      <figure className={styles.figure}>
        <span className={styles.frame}>
          <iframe
            src={src}
            title={caption || `${external.kind} video`}
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </span>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  return (
    <figure className={styles.figure}>
      <button
        type="button"
        className={styles.facade}
        onClick={() => setPlaying(true)}
        aria-label={caption ? `Play video: ${caption}` : "Play video"}
        style={
          external.thumbnail
            ? { backgroundImage: `url(${external.thumbnail})` }
            : undefined
        }
      >
        <span className={styles.play} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.2v13.6L19 12z" />
          </svg>
        </span>
      </button>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}