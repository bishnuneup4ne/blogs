"use client";

import { useState } from "react";
import styles from "./UnsubscribeForm.module.scss";

export function UnsubscribeForm({ email, token }: { email: string; token: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) throw new Error(data?.error || "Could not unsubscribe.");
      setStatus("done");
      setMessage("You are off the list. No more newsletter email from me.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Could not unsubscribe.");
    }
  }

  if (status === "done") return <p className={styles.done} role="status">{message}</p>;

  return (
    <form onSubmit={submit} className={styles.form}>
      <button type="submit" className="btn btn-primary" disabled={status === "sending"}>
        {status === "sending" ? "Removing…" : "Unsubscribe"}
      </button>
      {message ? <p className={styles.error} role="status">{message}</p> : null}
    </form>
  );
}
