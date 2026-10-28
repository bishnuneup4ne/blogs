"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./PostMetaBar.module.scss";

/* Read-aloud built on the Web Speech API.

   Three things break naive speechSynthesis use, all handled here:
   1. getVoices() is empty until the browser finishes loading them — we wait
      for `voiceschanged` and fall back to any English voice.
   2. Chrome silently stops any utterance longer than ~15 seconds, so the
      article is split into sentence-sized chunks fed one at a time.
   3. Selecting a voice we don't actually have throws, so the choice is
      validated before it is used. */
export function ArticleTools({ title, body }: { title: string; body: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [supported, setSupported] = useState(true);

  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const cancelledRef = useRef(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  /* Prefer a local English voice; the network ones are slow to start and often
     unavailable offline. */
  const pickVoice = useCallback(() => {
    const synth = window.speechSynthesis;
    const voices = synth.getVoices();
    if (!voices.length) return null;
    const english = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const pool = english.length ? english : voices;
    return pool.find((v) => v.localService) ?? pool[0] ?? null;
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    const load = () => {
      voiceRef.current = pickVoice();
    };
    load();
    // Voices arrive asynchronously (and often empty on first paint).
    window.speechSynthesis.addEventListener("voiceschanged", load);

    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      cancelledRef.current = true;
      window.speechSynthesis.cancel();
    };
  }, [pickVoice]);

  /* One utterance per sentence keeps Chrome from cutting out mid-article. */
  const speakFrom = useCallback(
    (index: number) => {
      const synth = window.speechSynthesis;
      const chunk = chunksRef.current[index];
      if (!chunk) {
        setSpeaking(false);
        setPaused(false);
        return;
      }
      indexRef.current = index;

      const utterance = new SpeechSynthesisUtterance(chunk);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.lang = voiceRef.current?.lang ?? "en-US";
      if (voiceRef.current) utterance.voice = voiceRef.current;

      utterance.onend = () => {
        if (cancelledRef.current) return;
        // Chrome fires onend immediately after cancel(); ignore that.
        if (!synth.speaking && !synth.pending && indexRef.current === index) {
          speakFrom(index + 1);
        }
      };
      utterance.onerror = (event) => {
        // "interrupted"/"canceled" are expected when the user stops playback.
        if (event.error === "interrupted" || event.error === "canceled") return;
        setSpeaking(false);
        setPaused(false);
      };

      synth.speak(utterance);
    },
    [],
  );

  function startListening() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    cancelledRef.current = false;
    synth.cancel();

    // Refresh the voice in case voices finished loading since mount.
    voiceRef.current = voiceRef.current ?? pickVoice();

    chunksRef.current = splitForSpeech(`${title}. ${body}`);
    indexRef.current = 0;
    setSpeaking(true);
    setPaused(false);
    speakFrom(0);
  }

  function toggleListen() {
    const synth = window.speechSynthesis;
    if (!synth) return;

    if (!speaking) {
      startListening();
      return;
    }

    if (paused) {
      cancelledRef.current = false;
      synth.resume();
      setPaused(false);
      // Chrome sometimes drops the queue after a long pause; restart if so.
      window.setTimeout(() => {
        if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
          speakFrom(indexRef.current);
        }
      }, 250);
    } else {
      synth.pause();
      setPaused(true);
    }
  }

  function stopListen() {
    cancelledRef.current = true;
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPaused(false);
    indexRef.current = 0;
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
        aria-pressed={speaking}
        aria-label={speaking ? (paused ? "Resume reading aloud" : "Pause reading aloud") : "Listen to this article"}
      >
        <span className={styles.listenIcon} aria-hidden="true">
          {speaking && !paused ? (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <rect x="7" y="5" width="3.5" height="14" rx="1" />
              <rect x="13.5" y="5" width="3.5" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 10v4h3l4 4V6l-4 4H4z" />
              <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
            </svg>
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

/* Split into sentence-sized pieces (~220 chars max) so no single utterance
   exceeds Chrome's speech limit. */
function splitForSpeech(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const sentences = clean.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let buffer = "";

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if ((buffer + " " + sentence).trim().length > 220 && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = `${buffer} ${sentence}`.trim();
    }
    // A single very long sentence still has to be broken up.
    while (buffer.length > 220) {
      const cut = buffer.lastIndexOf(" ", 220);
      const at = cut > 80 ? cut : 220;
      chunks.push(buffer.slice(0, at).trim());
      buffer = buffer.slice(at).trim();
    }
  }
  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}
