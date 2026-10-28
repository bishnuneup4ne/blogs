"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./PostContent.module.scss";

/** Load a third-party embed script once per page. */
function useEmbedScript(src: string) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    let active = true;
    if (document.querySelector(`script[src="${src}"]`)) {
      setLoaded(true);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      if (active) setLoaded(true);
    };
    s.onerror = () => {
      if (active) setLoaded(true); // give up; fallback markup stays visible
    };
    document.body.appendChild(s);
    return () => {
      active = false;
    };
  }, [src]);
  return loaded;
}

/** Instagram posts/reels/profiles: blockquote + embed.js upgrades it to the real card. */
function InstagramEmbed({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ready = useEmbedScript("https://www.instagram.com/embed.js");
  useEffect(() => {
    if (!ready) return;
    const win = window as Window & { instgrm?: { EmbedLoader?: { processEmbeds: (el?: Element) => void } } };
    win.instgrm?.EmbedLoader?.processEmbeds(hostRef.current ?? undefined);
  }, [ready]);
  return (
    <div ref={hostRef} className={styles.embedRich} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** X / Twitter tweets: blockquote.twitter-tweet + widgets.js renders the card. */
function TwitterEmbed({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ready = useEmbedScript("https://platform.twitter.com/widgets.js");
  useEffect(() => {
    if (!ready) return;
    const win = window as Window & { twq?: (cmd: "widgets" | "load", opts: { target?: Element }) => void };
    win.twq?.("widgets", { target: hostRef.current ?? undefined });
  }, [ready]);
  return (
    <div ref={hostRef} className={styles.embedRich} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** TikTok videos: blockquote.tiktok-embed + embed.js renders the player card. */
function TiktokEmbed({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const ready = useEmbedScript("https://connect.tiktok.net/embed.js");
  useEffect(() => {
    if (!ready) return;
    const win = window as Window & { tiktokEmbed?: { load: (el?: Element) => void } };
    win.tiktokEmbed?.load(hostRef.current ?? undefined);
  }, [ready]);
  return (
    <div ref={hostRef} className={styles.embedRich} dangerouslySetInnerHTML={{ __html: html }} />
  );
}

/** GitHub gists: script tag fetches and injects the gist itself. */
function GistEmbed({ url }: { url: string }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const m = url.match(/gist\.github\.com\/([^/]+)\/([a-f0-9]+)/i);
    if (!m) return;
    const id = `${m[1]}/${m[2]}`;
    const elId = `gist-embed-${id.replace("/", "-")}`;
    if (document.getElementById(elId)) return;
    const container = document.createElement("div");
    container.id = elId;
    container.className = styles.gistContainer;
    hostRef.current?.appendChild(container);
    const s = document.createElement("script");
    s.src = `https://gist.github.com/${id}.js`;
    s.async = true;
    document.body.appendChild(s);
  }, [url]);
  return <div ref={hostRef} className={styles.embedRich} />;
}

export function EmbedBlock({ url, html, kind, caption }: { url: string; html: string; kind: "iframe" | "instagram" | "twitter" | "tiktok" | "threads" | "gist"; caption?: string }) {
  let body: React.ReactNode;
  if (kind === "instagram") body = <InstagramEmbed html={html} />;
  else if (kind === "twitter") body = <TwitterEmbed html={html} />;
  else if (kind === "tiktok") body = <TiktokEmbed html={html} />;
  else if (kind === "gist") body = <GistEmbed url={url} />;
  else body = <div className={styles.embedFrame} dangerouslySetInnerHTML={{ __html: html }} />;

  return (
    <figure className={styles.embedWrap}>
      {body}
      {caption ? <figcaption className={styles.embedCaption}>{caption}</figcaption> : null}
    </figure>
  );
}
