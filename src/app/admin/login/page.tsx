"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/site";
import styles from "./login.module.scss";

const NOTES = [
  { label: "Posts", value: "Draft, schedule, publish" },
  { label: "Media", value: "Images and video in one library" },
  { label: "Subscribers", value: "Mail an essay to the list" },
];

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next") || "/admin";
        router.push(next.startsWith("/admin") ? next : "/admin");
        router.refresh();
        return;
      }
      const data = await res.json().catch(() => null);
      const msg = data?.message;
      setError(
        typeof msg === "string"
          ? msg.includes("Too many")
            ? "Too many attempts — wait a minute, then try again."
            : msg
          : "Invalid password. Access denied.",
      );
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <main className={`studio ${styles.page}`}>
      <section className={styles.pane} aria-labelledby="studio-title">
        <header className={styles.top}>
          <a href="/" className={styles.brand} aria-label={`${site.name} home`}>
            <span className={styles.mark} aria-hidden="true">
              B
            </span>
            <span className={styles.brandText}>
              <span className={styles.brandName}>Blog Studio</span>
              <span className={styles.brandKicker}>bishnuneupane13.com.np</span>
            </span>
          </a>
          <a href="/" className={styles.exit}>
            Back to site
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3.5 10.5 8 6 12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </header>

        <div className={styles.body}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Private studio</p>
            <h1 id="studio-title" className={styles.title}>
              Sign in to write.
            </h1>
            <p className={styles.sub}>
              The archive, the drafts, and the mailing list live behind one password.
            </p>
          </div>

          <form onSubmit={onSubmit} className={styles.card} noValidate>
            <label className={styles.field} htmlFor="studio-password">
              <span className={styles.label}>Password</span>
              <span className={styles.inputWrap}>
                <input
                  id="studio-password"
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  autoComplete="current-password"
                  autoFocus
                  required
                  spellCheck={false}
                  className={error ? `${styles.input} ${styles.inputError}` : styles.input}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? "studio-error" : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  className={styles.reveal}
                  aria-pressed={show}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M3 3l14 14M8.3 8.4a2.5 2.5 0 0 0 3.4 3.4M6.2 5.5C4.4 6.6 3 8.2 2.2 10c1.5 3.3 4.5 5.5 7.8 5.5 1.3 0 2.6-.3 3.7-.9M9.2 4.6c.3 0 .5-.1.8-.1 3.3 0 6.3 2.2 7.8 5.5-.5 1.2-1.3 2.3-2.2 3.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M2.2 10C3.7 6.7 6.7 4.5 10 4.5s6.3 2.2 7.8 5.5c-1.5 3.3-4.5 5.5-7.8 5.5S3.7 13.3 2.2 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  )}
                </button>
              </span>
            </label>

            {error ? (
              <p role="alert" id="studio-error" className={styles.error}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M8 5v3.6M8 11h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || !password}
              className={loading ? styles.submit : `${styles.submit} ${styles.submitIdle}`}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" />
                  Checking…
                </>
              ) : (
                "Sign in"
              )}
            </button>

            <p className={styles.formFoot}>
              <kbd className={styles.kbd}>Enter</kbd> to sign in
            </p>
          </form>
        </div>

        <ul className={styles.notes} aria-label="What lives in the studio">
          {NOTES.map((n) => (
            <li key={n.label} className={styles.note}>
              <span className={styles.noteLabel}>{n.label}</span>
              <span className={styles.noteValue}>{n.value}</span>
            </li>
          ))}
        </ul>
      </section>

      <aside className={styles.art} aria-hidden="true">
        <div className={styles.glowA} />
        <div className={styles.glowB} />
        <div className={styles.preview}>
          <div className={styles.previewTop}>
            <span className={styles.chip}>Draft</span>
            <span className={styles.previewMeta}>6 min read</span>
          </div>
          <p className={styles.previewTitle}>The architecture of a quieter web</p>
          <div className={styles.previewLines}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.previewFoot}>
            <span className={styles.dot} />
            Autosaved just now
          </div>
        </div>
      </aside>
    </main>
  );
}
