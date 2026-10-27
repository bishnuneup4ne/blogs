"use client";

import { useEffect, useMemo, useState } from "react";
import { api, useApiCollection, type ApiMessage } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "@/components/admin/Dialog";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { Card, PageHeader, Segmented, Table, DateCell } from "@/components/admin/kit";
import styles from "./messages.module.scss";

type Tab = "all" | "unread" | "read";

export default function AdminMessagesPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const messagesC = useApiCollection<ApiMessage>("/api/admin/messages", "messages");
  const [open, setOpen] = useState<ApiMessage | null>(null);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const counts = useMemo(() => {
    const unread = messagesC.items.filter((message) => !message.is_read).length;
    return { all: messagesC.items.length, unread, read: messagesC.items.length - unread };
  }, [messagesC.items]);

  const rows = messagesC.items.filter((message) => {
    if (tab === "unread") return !message.is_read;
    if (tab === "read") return message.is_read;
    return true;
  });

  async function setRead(message: ApiMessage, isRead: boolean) {
    setBusy(message.id);
    setError("");
    try {
      await api.patch(`/api/admin/messages/${message.id}`, { is_read: isRead });
      setOpen((current) => (current?.id === message.id ? { ...current, is_read: isRead } : current));
      await messagesC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update message");
    } finally {
      setBusy("");
    }
  }

  async function remove(message: ApiMessage) {
    const ok = await confirm({
      title: "Delete message",
      body: "Delete this message? You can undo this from the toast.",
      confirmLabel: "Delete message",
    });
    if (!ok) return;
    setBusy(message.id);
    setError("");
    try {
      await api.del(`/api/admin/messages/${message.id}`);
      toast("Message deleted", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/messages", {
              name: message.name,
              email: message.email,
              subject: message.subject,
              message: message.message,
              is_read: message.is_read,
            });
            await messagesC.reload();
            toast("Message restored", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore message");
          }
        },
      });
      if (open?.id === message.id) setOpen(null);
      await messagesC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete message");
    } finally {
      setBusy("");
    }
  }

  function openMessage(message: ApiMessage) {
    setError("");
    setOpen(message);
    if (!message.is_read) void setRead(message, true);
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Inbox" description="Messages sent from the contact form." />
      {error ? <p role="alert" className={styles.errorText}>{error}</p> : null}
      {messagesC.loading ? (
        <p className={styles.mutedCell}>Loading messages…</p>
      ) : messagesC.error ? (
        <p role="alert" className={styles.mutedCell}>Could not load messages: {messagesC.error}</p>
      ) : messagesC.items.length === 0 ? (
        <p className={styles.mutedCell}>Nothing here yet.</p>
      ) : (
        <>
          <Segmented<Tab>
            label="Filter by message status"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "unread", label: "Unread", count: counts.unread },
              { value: "read", label: "Read", count: counts.read },
            ]}
          />
          {rows.length === 0 ? (
            <p className={styles.mutedCell}>No messages match this filter.</p>
          ) : (
            <Card>
              <Table>
                <thead>
                  <tr>
                    <th>From</th>
                    <th>Subject</th>
                    <th>Date</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((m) => (
                    <tr key={m.id} className={m.is_read ? styles.readRow : undefined}>
                      <td data-label="From" data-card="title">
                        <p><strong>{m.name}</strong></p>
                        <p className={styles.subCell}>{m.email}</p>
                      </td>
                      <td data-label="Subject">{m.subject || "(no subject)"}</td>
                      <DateCell iso={String(m.created_at)} label="Received" />
                      <td data-label="Actions" data-card="actions">
                        <div className={styles.rowActions}>
                          <Button size="sm" variant="outlined" disabled={busy === m.id} onClick={() => openMessage(m)}>Open</Button>
                          <Button
                            size="sm"
                            variant="text"
                            tone="danger"
                            disabled={busy === m.id}
                            onClick={() => void remove(m)}
                          >
                            Delete
                          </Button>
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

      {open ? (
        <AdminDialog
          variant="modal"
          title={open.subject || "(no subject)"}
          onClose={() => setOpen(null)}
          footer={
            <>
              <a className="btn btn-outline" href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: ${open.subject || "your message"}`)}`}>Reply by email</a>
              {open.is_read ? (
                <Button variant="text" disabled={busy === open.id} onClick={() => void setRead(open, false)}>Mark unread</Button>
              ) : null}
              <Button variant="text" tone="danger" disabled={busy === open.id} onClick={() => void remove(open)}>Delete</Button>
              <Button onClick={() => setOpen(null)}>Close</Button>
            </>
          }
        >
            <p className={styles.modalMeta}>{open.name} &lt;{open.email}&gt;</p>
            <p className={styles.modalBody}>{open.message}</p>
            {error ? <p role="alert" className={styles.errorText}>{error}</p> : null}
        </AdminDialog>
      ) : null}
    </div>
  );
}
