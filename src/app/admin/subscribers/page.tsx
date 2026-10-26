"use client";

import { useMemo, useState } from "react";
import { api, useApiCollection, type ApiSubscriber } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { PageHeader, Segmented, StatusChip, statusTone, Table, DateCell } from "@/components/admin/kit";
import styles from "./subscribers.module.scss";

type Tab = "all" | "subscribed" | "pending" | "unsubscribed";

export default function AdminSubscribersPage() {
  const confirm = useConfirm();
  const toast = useToast();
  const subsC = useApiCollection<ApiSubscriber>("/api/admin/subscribers", "subscribers");
  const state = { subscribers: subsC.items.map((s) => ({ id: s.id, email: s.email, name: s.name || s.email.split("@")[0], status: s.status, source: s.source, joined: String(s.joined_at).slice(0, 10), opens: 0 })) };
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: state.subscribers.length };
    state.subscribers.forEach((s) => {
      c[s.status] = (c[s.status] ?? 0) + 1;
    });
    return c;
  }, [state.subscribers]);

  const rows = state.subscribers
    .filter((s) => (tab === "all" ? true : s.status === tab))
    .filter((s) => (query ? `${s.name} ${s.email}`.toLowerCase().includes(query.toLowerCase()) : true));

  async function setStatus(subscriber: { id: string; email: string; status: string }) {
    setBusy(subscriber.id);
    setError("");
    try {
      await api.patch("/api/admin/subscribers", {
        email: subscriber.email,
        status: subscriber.status === "subscribed" ? "unsubscribed" : "subscribed",
      });
      await subsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update subscriber");
    } finally {
      setBusy("");
    }
  }

  async function remove(subscriber: { id: string; email: string; name: string; status: string; source: string }) {
    const ok = await confirm({ title: "Remove subscriber", body: `Remove ${subscriber.email}?`, confirmLabel: "Remove subscriber" });
    if (!ok) return;
    setBusy(subscriber.id);
    setError("");
    try {
      await api.del(`/api/admin/subscribers?email=${encodeURIComponent(subscriber.email)}`);
      toast("Subscriber removed", "success", {
        label: "Undo",
        onClick: async () => {
          try {
            await api.post("/api/admin/subscribers", {
              email: subscriber.email,
              name: subscriber.name,
              status: subscriber.status,
              source: subscriber.source,
            });
            await subsC.reload();
            toast("Subscriber restored", "success");
          } catch (e) {
            toast(e instanceof Error ? e.message : "Could not restore subscriber");
          }
        },
      });
      await subsC.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove subscriber");
    } finally {
      setBusy("");
    }
  }

  function exportCsv() {
    const cell = (value: string) => {
      const clean = /^[=+\-@]/.test(value) ? `'${value}` : value;
      return `"${clean.replace(/"/g, '""')}"`;
    };
    const header = "name,email,joined,source,status\n";
    const body = rows
      .map((r) => [r.name, r.email, r.joined, r.source, r.status].map(cell).join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Subscribers"
        description="Everyone who opted in to the newsletter. Export the list or send a test issue."
        actions={
          <>
            <Button variant="outlined" onClick={exportCsv}>Export CSV</Button>
            <Button
              disabled={sending}
              onClick={async () => {
                setSending(true);
                try {
                  await api.post("/api/admin/send-email", {
                    test: true,
                    subject: "Test issue from the studio",
                    html: "<p>This is a test newsletter issue. If you can see this, delivery works.</p>",
                  });
                  setSent(true);
                  setTimeout(() => setSent(false), 2200);
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Send failed");
                } finally {
                  setSending(false);
                }
              }}
            >
              {sending ? "Sending…" : sent ? "Test sent" : "Send test email"}
            </Button>
          </>
        }
      />

      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}
      {subsC.loading ? <p className={styles.emptyNote}>Loading subscribers…</p> : null}
      {subsC.error ? <p role="alert" className={styles.formError}>Could not load subscribers: {subsC.error}</p> : null}

      <div className={styles.toolbar}>
        <Segmented<Tab>
          label="Subscriber status"
          value={tab}
          onChange={setTab}
          options={[
            { value: "all", label: "All", count: counts.all },
            { value: "subscribed", label: "Subscribed", count: counts.subscribed ?? 0 },
            { value: "pending", label: "Pending", count: counts.pending ?? 0 },
            { value: "unsubscribed", label: "Unsubscribed", count: counts.unsubscribed ?? 0 },
          ]}
        />
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email"
          aria-label="Search subscribers"
        />
      </div>

      {subsC.loading || subsC.error ? null : rows.length === 0 ? (
        <p className={styles.emptyNote}>No subscribers match this view.</p>
      ) : (
      <div className={styles.tableCard}>
        <Table>
          <thead>
            <tr>
              <th>Subscriber</th>
              <th>Status</th>
              <th>Source</th>
              <th>Joined</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id}>
                <td data-label="Subscriber" data-card="title">
                  <div className={styles.person}>
                    <span className={styles.avatar}>{s.name.split(" ").map((x) => x[0]).join("")}</span>
                    <div>
                      <p className={styles.name}>{s.name}</p>
                      <p className={styles.email}>{s.email}</p>
                    </div>
                  </div>
                </td>
                <td data-label="Status"><StatusChip status={s.status} tone={statusTone(s.status)} /></td>
                <td data-label="Source">{s.source}</td>
                <DateCell iso={s.joined} />
                <td data-label="Actions" data-card="actions">
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.textBtn}
                      disabled={busy === s.id}
                      onClick={() => void setStatus(s)}
                    >
                      {s.status === "subscribed" ? "Unsubscribe" : "Resubscribe"}
                    </button>
                    <button
                      type="button"
                      className={styles.textBtnDanger}
                      disabled={busy === s.id}
                      onClick={() => void remove(s)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      )}
    </div>
  );
}
