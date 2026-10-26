"use client";

import { useId, useState } from "react";
import styles from "./ContactForm.module.scss";

type Status = { tone: "idle" | "sending" | "sent" | "error"; message: string };

export function ContactForm() {
  const id = useId();
  const [status, setStatus] = useState<Status>({ tone: "idle", message: "" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setStatus({ tone: "sending", message: "" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          subject: data.get("subject"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error || "The message could not be sent.");
      form.reset();
      setStatus({ tone: "sent", message: "Thanks — I will get back to you when I can." });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "The message could not be sent.",
      });
    }
  }

  return (
    <section className={styles.section} aria-labelledby={`${id}-heading`}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>Contact</p>
          <h2 id={`${id}-heading`} className={styles.title}>Have something worth discussing?</h2>
          <p className={styles.body}>
            Questions, corrections, speaking invitations or a project you think I might be useful for. Messages
            land in a private inbox; no list, no autoresponder.
          </p>
        </div>
        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Name</span>
              <input name="name" required maxLength={120} autoComplete="name" placeholder="Your name" />
            </label>
            <label className={styles.field}>
              <span>Email</span>
              <input name="email" type="email" required maxLength={200} autoComplete="email" placeholder="you@example.com" />
            </label>
          </div>
          <label className={styles.field}>
            <span>Subject</span>
            <input name="subject" maxLength={200} placeholder="What is this about?" />
          </label>
          <label className={styles.field}>
            <span>Message</span>
            <textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder="Say it plainly — I read everything." />
          </label>
          <label className={styles.honeypot} aria-hidden="true">
            Website
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
          <div className={styles.actions}>
            <button type="submit" className="btn btn-primary" disabled={status.tone === "sending"}>
              {status.tone === "sending" ? "Sending…" : "Send message"}
            </button>
            <p
              className={`${styles.status} ${status.tone === "error" ? styles.error : ""}`}
              role="status"
              aria-live="polite"
            >
              {status.message}
            </p>
          </div>
        </form>
      </div>
    </section>
  );
}
