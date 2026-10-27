"use client";

import { useState } from "react";
import { detectExternalVideo } from "@/lib/external-video";
import styles from "./VideoEmbed.module.scss";

/* External videos show a poster until the reader clicks; direct uploads can
   opt into muted ambient autoplay from the editor. */
export function VideoEmbed({
  url,
  caption,
  poster,
  autoplay = false,
}: {
  url: string;
  caption?: string;
  poster?: string;
  autoplay?: boolean;
}) {
  const external = detectExternalVideo(url);
  const [playing, setPlaying] = useState(false);

  if (!external) {
    return (
      <figure className={styles.figure}>
        <video
          src={url}
          poster={poster || undefined}
          controls
          playsInline
          preload={autoplay ? "auto" : "metadata"}
          autoPlay={autoplay}
          muted={autoplay}
          loop={autoplay}
          className={styles.file}
        />
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
        style={external.thumbnail || poster ? { backgroundImage: `url(${external.thumbnail || poster})` } : undefined}
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
