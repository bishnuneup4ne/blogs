"use client";

import { useState } from "react";
import styles from "./NewsletterForm.module.scss";

export function NewsletterForm({ variant = "inline" }: { variant?: "inline" | "card" }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("sending");
    const res = await fetch("/api/subscribers", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, website }),
    }).catch(() => null);
    if (res?.ok) {
      setState("done");
    } else {
      const data = await res?.json().catch(() => null);
      setMessage(data?.error || "Something went wrong. Try again.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className={styles.done} role="status">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        Thanks — you&apos;re on the list. New notes will land in your inbox.
      </p>
    );
  }

  return (
    <form className={variant === "card" ? `${styles.form} ${styles.formCard}` : styles.form} onSubmit={onSubmit}>
      <label htmlFor="newsletter-email" className="sr-only">Email address</label>
      <input
        id="newsletter-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email address"
        className={styles.input}
      />
      <button type="submit" className={styles.submit} disabled={state === "sending"}>
        {state === "sending" ? "Subscribing…" : "Subscribe"}
      </button>
      {/* honeypot — humans never see or fill this */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
      />
      {state === "error" ? <p role="alert" className={styles.error}>{message}</p> : null}
    </form>
  );
}
