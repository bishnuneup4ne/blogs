"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { validateName } from "@/lib/comment-name";
import styles from "./Comments.module.scss";

interface Comment {
  id: string;
  name: string;
  body: string;
  created_at: string;
  parent_id?: string | null;
}

function when(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
}

export function Comments({ slug, embedded = false }: { slug: string; embedded?: boolean }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [status, setStatus] = useState<{ tone: "idle" | "sent" | "error"; message: string }>({
    tone: "idle",
    message: "",
  });
  const listRef = useRef<HTMLOListElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { comments?: Comment[]; available?: boolean } | null;
      setComments(data?.comments ?? []);
      setAvailable(res.ok && data?.available !== false);
    } catch {
      setComments([]);
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  // Entrance stagger for the thread (skip under reduced motion).
  useEffect(() => {
    const list = listRef.current;
    if (!list || loading || comments.length === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!list.children.length) return;
    const ctx = gsap.context(() => {
      gsap.from(list.children, { opacity: 0, y: 14, duration: 0.45, stagger: 0.06, ease: "power2.out" });
    }, list);
    return () => ctx.revert();
  }, [loading, comments.length]);

  const roots = comments.filter((c) => !c.parent_id);
  const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

  function startReply(comment: Comment) {
    setReplyTo(comment);
    setStatus({ tone: "idle", message: "" });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    bodyRef.current?.focus();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const nameError = validateName(String(data.get("name") ?? ""));
    if (nameError) {
      setStatus({ tone: "error", message: nameError });
      return;
    }
    setSending(true);
    setStatus({ tone: "idle", message: "" });
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          name: data.get("name"),
          email: data.get("email"),
          body: data.get("body"),
          website: data.get("website"),
          parentId: replyTo?.id ?? null,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(body?.error || "The comment could not be sent.");
      form.reset();
      setReplyTo(null);
      setStatus({
        tone: "sent",
        message: replyTo ? "Thanks — your reply is waiting for moderation." : "Thanks — your comment is waiting for moderation.",
      });
    } catch (error) {
      setStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "The comment could not be sent.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="comments-heading">
      {!embedded ? (
        <div className={styles.head}>
          <h2 id="comments-heading" className={styles.title}>Comments</h2>
          {!loading && comments.length > 0 ? <span className={styles.count}>{roots.length}</span> : null}
        </div>
      ) : null}
      <p className={styles.note}>Comments are moderated — useful and kind, no link drops.</p>

      {loading ? <p className={styles.empty}>Loading comments…</p> : null}
      {!loading && !available ? (
        <p className={styles.empty}>Comments are unavailable right now. Please check back later.</p>
      ) : null}
      {!loading && available && roots.length === 0 ? (
        <p className={styles.empty}>No comments yet — start the conversation below.</p>
      ) : null}

      {roots.length > 0 ? (
        <ol ref={listRef} className={styles.list}>
          {roots.map((comment) => {
            const replies = repliesOf(comment.id);
            return (
              <li key={comment.id} className={styles.thread}>
                <article className={styles.comment}>
                  <span className={styles.avatar} aria-hidden="true">{initials(comment.name)}</span>
                  <div className={styles.commentMain}>
                    <div className={styles.commentHead}>
                      <strong>{comment.name}</strong>
                      <time dateTime={comment.created_at}>{when(comment.created_at)}</time>
                    </div>
                    <p className={styles.commentBody}>{comment.body}</p>
                    <button type="button" className={styles.replyBtn} onClick={() => startReply(comment)}>
                      Reply
                    </button>
                  </div>
                </article>
                {replies.length > 0 ? (
                  <ol className={styles.replies}>
                    {replies.map((reply) => (
                      <li key={reply.id} className={styles.comment}>
                        <span className={styles.avatar} aria-hidden="true">{initials(reply.name)}</span>
                        <div className={styles.commentMain}>
                          <div className={styles.commentHead}>
                            <strong>{reply.name}</strong>
                            <time dateTime={reply.created_at}>{when(reply.created_at)}</time>
                          </div>
                          <p className={styles.commentBody}>{reply.body}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : null}

      {!loading && available ? (
      <form ref={formRef} className={styles.form} onSubmit={onSubmit}>
        {replyTo ? (
          <div className={styles.replyingTo}>
            Replying to <strong>{replyTo.name}</strong>
            <button type="button" className={styles.cancelReply} onClick={() => setReplyTo(null)}>
              Cancel
            </button>
          </div>
        ) : null}
        <div className={styles.row}>
          <label className={styles.field}>
            <span>Name <em>real name, first and last</em></span>
            <input name="name" required maxLength={80} autoComplete="name" placeholder="e.g. Bishnu Neupane" />
          </label>
          <label className={styles.field}>
            <span>Email <em>optional, never published</em></span>
            <input name="email" type="email" maxLength={200} autoComplete="email" placeholder="you@example.com" />
          </label>
        </div>
        <label className={styles.field}>
          <span>{replyTo ? "Reply" : "Comment"}</span>
          <textarea
            ref={bodyRef}
            name="body"
            required
            minLength={3}
            maxLength={3000}
            rows={4}
            placeholder={replyTo ? `Reply to ${replyTo.name}…` : "What stood out to you?"}
          />
        </label>
        <label className={styles.honeypot} aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={sending}>
            {sending ? "Sending…" : replyTo ? "Post reply" : "Post comment"}
          </button>
          {status.message ? (
            <p
              className={`${styles.status} ${status.tone === "error" ? styles.error : ""} ${status.tone === "sent" ? styles.sent : ""}`}
              role="status"
              aria-live="polite"
            >
              {status.message}
            </p>
          ) : null}
        </div>
      </form>
      ) : null}
    </section>
  );
}
