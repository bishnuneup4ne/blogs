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

  return (
    <div className={styles.tools}>
      <button type="button" className={styles.listen} onClick={toggleListen}>
        {speaking ? (paused ? "Resume" : "Pause") : "Listen to this article"}
      </button>
      {speaking ? (
        <button type="button" className={styles.listen} onClick={stopListen}>
          Stop
        </button>
      ) : null}
    </div>
  );
}
