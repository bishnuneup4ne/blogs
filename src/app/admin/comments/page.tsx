"use client";

import { useMemo, useState } from "react";
import { api, useApiCollection, type ApiComment } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { Card, PageHeader, Segmented, StatusChip, Table } from "@/components/admin/kit";
import kit from "@/components/admin/kit.module.scss";
import styles from "./comments.module.scss";
import { DateCell } from "@/components/admin/kit";

type Tab = "all" | ApiComment["status"];

export default function AdminCommentsPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const commentsC = useApiCollection<ApiComment>("/api/admin/comments", "comments");
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const counts = useMemo(() => {
    const next: Record<string, number> = { all: commentsC.items.length };
    commentsC.items.forEach((comment) => {
      next[comment.status] = (next[comment.status] ?? 0) + 1;
    });
    return next;
  }, [commentsC.items]);

  const rows = commentsC.items.filter((comment) => tab === "all" || comment.status === tab);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

  async function remove(comment: ApiComment) {
    const ok = await confirm({
      title: "Delete comment",
      body: "Delete this comment? You can undo this from the toast.",
      confirmLabel: "Delete comment",
    });
    if (!ok) return;
    setBusy(comment.id);
    setError("");
    try {
      await api.del(`/api/admin/comments/${comment.id}`);
      toast("Comment deleted", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/comments", {
              post_slug: comment.post_slug,
              name: comment.name,
              email: comment.email,
              body: comment.body,
              status: comment.status,
              parent_id: comment.parent_id ?? null,
            });
            await commentsC.reload();
            toast("Comment restored", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore comment");
          }
        },
      });
      await commentsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete comment");
    } finally {
      setBusy("");
    }
  }

  async function bulk(action: "approve" | "pending" | "spam" | "delete") {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === "delete") {
      const ok = await confirm({
        title: `Delete ${ids.length} ${ids.length === 1 ? "comment" : "comments"}`,
        body: "This removes them permanently. The Undo button on the toast puts them back.",
        confirmLabel: "Delete",
      });
      if (!ok) return;
    }
    setBulkBusy(true);
    setSelected(new Set());
    setError("");
    try {
      const res = await api.post<{ updated?: number; deleted?: number; comments?: unknown[] }>(
        "/api/admin/comments/bulk",
        { action, ids },
      );
      if (action === "delete") {
        const snapshot = res.comments ?? [];
        toast(`${res.deleted ?? ids.length} deleted`, "success", {
          label: "Undo",
          onClick: async () => {
            try {
              await Promise.all(
                snapshot.map((c) => api.post("/api/admin/comments", c as Record<string, unknown>)),
              );
              await commentsC.reload();
              toast("Comments restored", "success");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Could not restore comments");
            }
          },
        });
      } else {
        toast(`${res.updated ?? ids.length} ${action === "approve" ? "approved" : action === "spam" ? "marked as spam" : "held"}`, "success");
      }
      await commentsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bulk update failed");
    } finally {
      setBulkBusy(false);
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
          {selected.size > 0 ? (
            <div className={styles.bulk} role="region" aria-label="Bulk actions">
              <span>{selected.size} selected</span>
              <Button size="sm" onClick={() => bulk("approve")} disabled={bulkBusy}>Approve</Button>
              <Button size="sm" variant="outlined" onClick={() => bulk("pending")} disabled={bulkBusy}>Hold</Button>
              <Button size="sm" variant="outlined" onClick={() => bulk("spam")} disabled={bulkBusy}>Spam</Button>
              <Button size="sm" variant="text" tone="danger" onClick={() => bulk("delete")} disabled={bulkBusy}>Delete</Button>
              <Button size="sm" variant="text" onClick={() => setSelected(new Set())} disabled={bulkBusy}>Clear</Button>
            </div>
          ) : null}
          {rows.length === 0 ? (
            <p className={styles.emptyNote}>No comments match this filter.</p>
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th className={styles.checkCol}>
                      <input
                        type="checkbox"
                        aria-label="Select all comments"
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())}
                      />
                    </th>
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
                      <td className={styles.checkCol} data-label="Select">
                        <input
                          type="checkbox"
                          aria-label={`Select comment by ${c.name}`}
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                      </td>
                      <td data-label="Comment" data-card="title">
                        <p><strong>{c.name}</strong></p>
                        <p className={styles.subCell}>{c.body}</p>
                      </td>
                      <td data-label="Post">{c.post_slug ?? "—"}</td>
                      <td data-label="Status"><StatusChip status={c.status} tone={c.status === "approved" ? "green" : c.status === "spam" ? "red" : "yellow"} /></td>
                      <DateCell iso={String(c.created_at)} size="small" />
                      <td data-label="Actions" data-card="actions">
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
                          <Button size="sm" variant="text" tone="danger" disabled={busy === c.id} onClick={() => void remove(c)}>Delete</Button>
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
