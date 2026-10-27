"use client";

import { useState } from "react";
import { detectExternalVideo } from "@/lib/external-video";
import styles from "./VideoEmbed.module.scss";

/* Poster with a play button — nothing from YouTube loads until the reader
   actually clicks. No autoplay, no ambient embed, no hover surprises. */
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

  if (!playing) {
    // Show thumbnail/placeholder for external video until user clicks
    return (
      <figure className={styles.figure}>
        <div className={styles.facade} style={external.thumbnail ? { backgroundImage: `url(${external.thumbnail})` } : undefined}>
          <span className={styles.play} aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.2v13.6L19 12z" />
            </svg>
          </span>
        </div>
        {caption ? <figcaption>{caption}</figcaption> : null}
      </figure>
    );
  }

  if (playing) {
    const yt = external.kind === "youtube";
    const base = yt ? external.embedUrl.replace("youtube.com", "youtube-nocookie.com") : external.embedUrl;
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
      ...(yt ? { color: "white" } : { dnt: "1", titleless: "1", color: "ffffff" }),
    });
    return (
      <figure className={styles.figure}>
        <span className={styles.frame}>
          <iframe
            src={`${base}?${params.toString()}`}
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
        style={external.thumbnail ? { backgroundImage: `url(${external.thumbnail})` } : undefined}
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
