"use client";

import { useEffect, useState } from "react";
import { api, useApiCollection, type ApiAuthor } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { AdminDialog } from "@/components/admin/Dialog";
import { useConfirm, useToast } from "@/components/admin/Feedback";
import { EmptyState, PageHeader, StatusChip } from "@/components/admin/kit";
import { SocialIcon } from "@/components/icons/Icons";
import styles from "./authors.module.scss";

/** Icons an author link can pick — matches socialPaths in Icons.tsx. */
const ICON_CHOICES = [
  { id: "x", label: "X" },
  { id: "github", label: "GitHub" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "instagram", label: "Instagram" },
  { id: "youtube", label: "YouTube" },
  { id: "facebook", label: "Facebook" },
  { id: "threads", label: "Threads" },
  { id: "email", label: "Email" },
];

type DraftLink = { label: string; url: string; icon?: string };

type Draft = {
  id?: string;
  name: string;
  role: string;
  email: string;
  bio: string;
  avatar_url: string;
  status: "active" | "inactive";
  social_links: DraftLink[];
};

const EMPTY: Draft = {
  name: "",
  role: "",
  email: "",
  bio: "",
  avatar_url: "",
  status: "active",
  social_links: [],
};

function toDraft(a: ApiAuthor): Draft {
  return {
    id: a.id,
    name: a.name,
    role: a.role ?? "",
    email: a.email ?? "",
    bio: a.bio ?? "",
    avatar_url: a.avatar_url ?? "",
    status: a.status === "inactive" ? "inactive" : "active",
    social_links: (a.social_links ?? []).map((l) => ({ label: l.label, url: l.url, icon: l.icon })),
  };
}

export default function AdminAuthorsPage() {
  const authorsC = useApiCollection<ApiAuthor>("/api/admin/authors", "authors");
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function openNew() {
    setDraft({ ...EMPTY });
  }

  async function save() {
    if (!draft || !draft.name.trim()) {
      toast("Name is required");
      return;
    }
    setSaving(true);
    try {
      if (draft.id) {
        await api.patch(`/api/admin/authors/${draft.id}`, draft);
        toast("Author updated", "success");
      } else {
        await api.post("/api/admin/authors", draft);
        toast("Author added", "success");
      }
      setDraft(null);
      await authorsC.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save author");
    } finally {
      setSaving(false);
    }
  }

  async function remove(a: ApiAuthor) {
    const ok = await confirm({
      title: "Delete author",
      body: `Remove “${a.name}”? Posts keep their own byline, but the author profile is gone.`,
      confirmLabel: "Delete",
    });
    if (!ok) return;
    try {
      await api.del(`/api/admin/authors/${a.id}`);
      toast("Author deleted", "success");
      await authorsC.reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed");
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true);
    try {
      const r = await api.upload(file);
      setDraft((d) => (d ? { ...d, avatar_url: r.src } : d));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Authors"
        description="People who write here — bylines, bios and their social links."
        actions={
          <Button size="sm" variant="outlined" onClick={authorsC.reload}>
            Refresh
          </Button>
        }
      />

      <div className={styles.toolbar}>
        <Button size="sm" onClick={openNew}>
          + Add author
        </Button>
      </div>

      {authorsC.loading ? (
        <p className={styles.muted}>Loading authors…</p>
      ) : authorsC.error ? (
        <p className={styles.muted}>Could not load authors: {authorsC.error}</p>
      ) : authorsC.items.length === 0 ? (
        <EmptyState
          title="No authors yet"
          body="Add the people who write here — each gets a name, role, bio and social links."
          action="Add author"
          href="#"
        />
      ) : (
        <ul className={styles.grid}>
          {authorsC.items.map((a) => (
            <li key={a.id} className={styles.card}>
              <span className={styles.avatar}>
                {a.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.avatar_url} alt="" />
                ) : (
                  a.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((n) => n[0]?.toUpperCase())
                    .join("")
                )}
              </span>
              <div className={styles.body}>
                <div className={styles.headRow}>
                  <strong className={styles.name}>{a.name}</strong>
                  {a.status === "inactive" ? <StatusChip status="Inactive" tone="gray" /> : null}
                </div>
                {a.role ? <p className={styles.role}>{a.role}</p> : null}
                {a.bio ? <p className={styles.bio}>{a.bio}</p> : null}
                {(a.social_links ?? []).length > 0 ? (
                  <ul className={styles.links}>
                    {a.social_links!.map((l, i) => (
                      <li key={i}>
                        <a href={l.url} target="_blank" rel="noreferrer noopener" title={l.label}>
                          <SocialIcon name={l.icon ?? "email"} width={15} height={15} aria-hidden="true" />
                          <span>{l.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className={styles.noLinks}>No links yet</p>
                )}
              </div>
              <div className={styles.actions}>
                <Button size="sm" variant="outlined" onClick={() => setDraft(toDraft(a))}>
                  Edit
                </Button>
                <Button size="sm" variant="text" tone="danger" onClick={() => void remove(a)}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <AdminDialog
          title={draft.id ? "Edit author" : "Add author"}
          onClose={() => setDraft(null)}
          footer={
            <>
              <Button variant="outlined" size="sm" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              <Button size="sm" disabled={saving || !draft.name.trim()} onClick={() => void save()}>
                {saving ? "Saving…" : draft.id ? "Save changes" : "Add author"}
              </Button>
            </>
          }
        >
          <div className={styles.form}>
            <div className={styles.formTop}>
              <label className={styles.avatarPick}>
                {draft.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={draft.avatar_url} alt="" />
                ) : (
                  <span>{draft.name.trim().slice(0, 2).toUpperCase() || "?"}</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAvatar(f);
                    e.target.value = "";
                  }}
                />
                <em>{uploading ? "…" : "Photo"}</em>
              </label>
              <div className={styles.formCols}>
                <label className={styles.field}>
                  <span>Name *</span>
                  <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Full name" autoFocus />
                </label>
                <label className={styles.field}>
                  <span>Role</span>
                  <input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} placeholder="e.g. Editor at large" />
                </label>
              </div>
            </div>

            <label className={styles.field}>
              <span>Avatar URL</span>
              <input value={draft.avatar_url} onChange={(e) => setDraft({ ...draft, avatar_url: e.target.value })} placeholder="…or upload a photo" />
            </label>

            <label className={styles.field}>
              <span>Email</span>
              <input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="name@example.com" />
            </label>

            <label className={styles.field}>
              <span>Bio</span>
              <textarea rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} placeholder="One or two lines about the person" />
            </label>

            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.status === "active"}
                onChange={(e) => setDraft({ ...draft, status: e.target.checked ? "active" : "inactive" })}
              />
              <span>
                <strong>Active</strong>
                <em>Inactive authors are hidden from bylines.</em>
              </span>
            </label>

            <div className={styles.linksHead}>
              <span>Social links</span>
              <button
                type="button"
                className={styles.addLink}
                onClick={() =>
                  setDraft({ ...draft, social_links: [...draft.social_links, { label: "", url: "", icon: "x" }] })
                }
              >
                + Add link
              </button>
            </div>

            {draft.social_links.length === 0 ? (
              <p className={styles.muted}>No links yet — add X, GitHub, LinkedIn… whatever this person uses.</p>
            ) : null}

            {draft.social_links.map((l, i) => (
              <div key={i} className={styles.linkRow}>
                <select
                  aria-label="Icon"
                  value={l.icon ?? ""}
                  onChange={(e) => {
                    const next = [...draft.social_links];
                    const icon = e.target.value;
                    next[i] = { ...l, icon: icon || undefined, label: l.label || ICON_CHOICES.find((c) => c.id === icon)?.label || "" };
                    setDraft({ ...draft, social_links: next });
                  }}
                >
                  <option value="">—</option>
                  {ICON_CHOICES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  value={l.label}
                  placeholder="Label"
                  onChange={(e) => {
                    const next = [...draft.social_links];
                    next[i] = { ...l, label: e.target.value };
                    setDraft({ ...draft, social_links: next });
                  }}
                />
                <input
                  value={l.url}
                  placeholder="https://… or mailto:"
                  onChange={(e) => {
                    const next = [...draft.social_links];
                    next[i] = { ...l, url: e.target.value };
                    setDraft({ ...draft, social_links: next });
                  }}
                />
                <button
                  type="button"
                  className={styles.removeLink}
                  aria-label="Remove link"
                  onClick={() => setDraft({ ...draft, social_links: draft.social_links.filter((_, idx) => idx !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </AdminDialog>
      ) : null}
    </div>
  );
}