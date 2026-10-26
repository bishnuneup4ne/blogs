"use client";

import { useMemo, useState } from "react";
import { api, useApiCollection, type ApiComment } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { Card, PageHeader, Segmented, StatusChip, Table } from "@/components/admin/kit";
import kit from "@/components/admin/kit.module.scss";
import { formatDate } from "@/lib/dates";
import styles from "./comments.module.scss";

type Tab = "all" | ApiComment["status"];

export default function AdminCommentsPage() {
  const commentsC = useApiCollection<ApiComment>("/api/admin/comments", "comments");
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: commentsC.items.length };
    commentsC.items.forEach((comment) => {
      next[comment.status] = (next[comment.status] ?? 0) + 1;
    });
    return next;
  }, [commentsC.items]);

  const rows = commentsC.items.filter((comment) => tab === "all" || comment.status === tab);

  async function setStatus(id: string, status: ApiComment["status"]) {
    setBusy(id);
    setError("");
    try {
      await api.patch(`/api/admin/comments/${id}`, { status });
      await commentsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update comment");
    } finally {
      setBusy("");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this comment permanently?")) return;
    setBusy(id);
    setError("");
    try {
      await api.del(`/api/admin/comments/${id}`);
      await commentsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete comment");
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <PageHeader title="Comments" description="Reader responses on published posts. Approve to show them under the article." />
      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {commentsC.loading ? (
        <p className={styles.emptyNote}>Loading comments…</p>
      ) : commentsC.error ? (
        <p role="alert" className={styles.emptyNote}>Could not load comments: {commentsC.error}</p>
      ) : commentsC.items.length === 0 ? (
        <p className={styles.emptyNote}>No comments yet. New reader comments appear here for moderation.</p>
      ) : (
        <>
          <div className={styles.toolbar}>
            <Segmented<Tab>
              label="Filter by comment status"
              value={tab}
              onChange={setTab}
              options={[
                { value: "all", label: "All", count: counts.all },
                { value: "pending", label: "Pending", count: counts.pending ?? 0 },
                { value: "approved", label: "Approved", count: counts.approved ?? 0 },
                { value: "spam", label: "Spam", count: counts.spam ?? 0 },
              ]}
            />
          </div>
          {rows.length === 0 ? (
            <p className={styles.emptyNote}>No comments match this filter.</p>
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Post</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <p><strong>{c.name}</strong></p>
                        <p className={styles.subCell}>{c.body}</p>
                      </td>
                      <td>{c.post_slug ?? "—"}</td>
                      <td><StatusChip status={c.status} tone={c.status === "approved" ? "green" : c.status === "spam" ? "red" : "yellow"} /></td>
                      <td className={styles.mutedCell}>{formatDate(String(c.created_at).slice(0, 10))}</td>
                      <td>
                        <div className={kit.rowActions}>
                          {c.status !== "approved" ? (
                            <Button size="sm" disabled={busy === c.id} onClick={() => void setStatus(c.id, "approved")}>Approve</Button>
                          ) : null}
                          {c.status !== "pending" ? (
                            <Button size="sm" variant="outlined" disabled={busy === c.id} onClick={() => void setStatus(c.id, "pending")}>Hold</Button>
                          ) : null}
                          {c.status !== "spam" ? (
                            <Button size="sm" variant="outlined" disabled={busy === c.id} onClick={() => void setStatus(c.id, "spam")}>Spam</Button>
                          ) : null}
                          <Button size="sm" variant="text" tone="danger" disabled={busy === c.id} onClick={() => void remove(c.id)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
