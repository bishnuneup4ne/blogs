"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { site } from "@/lib/site";
import styles from "./login.module.scss";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      const next = new URLSearchParams(window.location.search).get("next") || "/admin";
      router.push(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => null);
      setError(data?.message || "Invalid password. Access denied.");
      setLoading(false);
    }
  }

  return (
    <main className={`studio ${styles.page}`}>
      <section className={styles.brandPane}>
        <a href="/" className={styles.brand} aria-label={`${site.name} home`}>
          <span className={styles.brandText}>
            <span className={styles.brandName}>
              <span className={styles.brandPrefix}>News from </span>
              {site.name}
            </span>
          </span>
        </a>

        <div className={styles.pitch}>
          <p className={styles.kicker}>Writing room</p>
          <p className={styles.headline}>A quiet workspace for stories that matter.</p>
          <p className={styles.lede}>
            Draft, edit and publish the archive. Everything here stays private until it is ready.
          </p>
        </div>

        <div className={styles.preview} aria-hidden="true">
          <div className={styles.previewTop}>
            <span className={styles.previewChip}>Draft</span>
            <span>6 min read</span>
          </div>
          <p className={styles.previewTitle}>The architecture of a quieter web</p>
          <div className={styles.previewLines}>
            <span />
            <span />
            <span />
          </div>
          <div className={styles.previewFoot}>
            <span className={styles.previewDot} />
            Autosaved just now
          </div>
        </div>

        <p className={styles.brandFoot}>Private studio access.</p>
      </section>

      <section className={styles.formPane}>
        <form onSubmit={onSubmit} className={styles.card}>
          <div className={styles.mobileBrand} aria-hidden="true">
            <span>News from {site.name}</span>
            <span>Studio</span>
          </div>

          <div className={styles.head}>
            <p className={styles.eyebrow}>Studio sign in</p>
            <h1 className={styles.title}>Welcome back.</h1>
            <p className={styles.sub}>Enter the admin password to manage your blog.</p>
          </div>

          <label className={styles.field} htmlFor="studio-password">
            <span className={styles.label}>Password</span>
            <input
              id="studio-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className={error ? `${styles.input} ${styles.inputError}` : styles.input}
            />
          </label>

          {error ? (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}

          <button type="submit" disabled={loading} className={styles.submit}>
            {loading ? "Checking…" : "Sign in"}
          </button>

          <div className={styles.formFoot}>
            <a href="/" className={styles.back}>Back to site</a>
            <span className={styles.privateNote}>Private area</span>
          </div>
        </form>
      </section>
    </main>
  );
}
