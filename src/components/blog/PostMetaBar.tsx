"use client";

import { useEffect, useState } from "react";
import styles from "./PostMetaBar.module.scss";

export function ArticleTools({ title, body }: { title: string; body: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) setSupported(false);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  function toggleListen() {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (speaking) {
      if (paused) {
        synth.resume();
        setPaused(false);
      } else {
        synth.pause();
        setPaused(true);
      }
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(`${title}. ${body}`);
    utterance.rate = 1;
    utterance.lang = "en-US";
    utterance.onend = () => {
      setSpeaking(false);
      setPaused(false);
    };
    utterance.onerror = () => {
      setSpeaking(false);
      setPaused(false);
    };
    synth.speak(utterance);
    setSpeaking(true);
    setPaused(false);
  }

  function stopListen() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
  }

  if (!supported) return null;

  const wordCount = body.split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(wordCount / 180));

  return (
    <div className={styles.tools}>
      <button
        type="button"
        className={speaking ? `${styles.listen} ${styles.listenOn}` : styles.listen}
        onClick={toggleListen}
        aria-label={speaking ? (paused ? "Resume reading aloud" : "Pause reading aloud") : "Listen to this article"}
      >
        <span className={styles.listenIcon} aria-hidden="true">
          {speaking && !paused ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10v4h3l4 4V6l-4 4H4z" /><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" /></svg>
          )}
        </span>
        <span className={styles.listenText}>
          <strong>{speaking ? (paused ? "Resume" : "Pause") : "Listen to this article"}</strong>
          <em>{minutes} min · text to speech</em>
        </span>
      </button>
      {speaking ? (
        <button type="button" className={styles.listenStop} onClick={stopListen} aria-label="Stop reading aloud">
          Stop
        </button>
      ) : null}
    </div>
  );
}
