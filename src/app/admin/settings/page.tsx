"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { Card, CardHead, PageHeader } from "@/components/admin/kit";
import styles from "./settings.module.scss";

interface SettingsForm {
  identity: { wordmark: string; siteName: string; tagline: string; email: string; location: string; avatarUrl: string };
  hero: { title: string; standfirst: string };
  socials: { label: string; href: string }[];
  toggles: { newsletter: boolean; comments: boolean; views: boolean; contactForm: boolean };
  nav: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
}

const BLANK: SettingsForm = {
  identity: { wordmark: "", siteName: "", tagline: "", email: "", location: "", avatarUrl: "" },
  hero: { title: "", standfirst: "" },
  socials: [],
  toggles: { newsletter: true, comments: true, views: true, contactForm: true },
  nav: [],
  footerLinks: [],
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState<SettingsForm>(BLANK);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState("");

  useEffect(() => {
    api.get<{ payload: SettingsForm }>("/api/admin/settings")
      .then((d) => setForm({ ...BLANK, ...d.payload, identity: { ...BLANK.identity, ...d.payload?.identity }, toggles: { ...BLANK.toggles, ...d.payload?.toggles } }))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setLoaded(true));
  }, []);

  async function persist(next: SettingsForm) {
    setBusy(true);
    setError("");
    try {
      await api.put("/api/admin/settings", next);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  function patch<K extends keyof SettingsForm>(key: K, value: Partial<SettingsForm[K]>) {
    setForm((f) => ({ ...f, [key]: { ...(f[key] as object), ...(value as object) } }));
    setSaved(false);
  }

  async function exportBackup() {
    setBackupBusy(true);
    setBackupError("");
    try {
      const dump = await Promise.all([
        api.get<{ posts: unknown[] }>("/api/admin/posts"),
        api.get<{ topics: unknown[] }>("/api/admin/topics"),
        api.get<{ authors: unknown[] }>("/api/admin/authors"),
        api.get<{ albums: unknown[] }>("/api/admin/albums"),
        api.get<{ photos: unknown[] }>("/api/admin/photos"),
        api.get<{ subscribers: unknown[] }>("/api/admin/subscribers"),
        api.get<{ payload: unknown }>("/api/admin/settings"),
      ]);
      const blob = new Blob([JSON.stringify(Object.fromEntries(dump.map((d, i) => [["posts", "topics", "authors", "albums", "photos", "subscribers", "payload"][i], d])), null, 1)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const siteSlug = (form.identity.siteName || "studio").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "studio";
      const link = document.createElement("a");
      link.href = url;
      link.download = `${siteSlug}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setBackupError(e instanceof Error ? e.message : "Backup failed");
    } finally {
      setBackupBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Site identity, newsletter and delivery options."
        actions={
          <Button disabled={!loaded || busy} onClick={() => persist(form)}>
            {busy ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
        }
      />

      {error ? <p role="alert" className={styles.formError}>{error}</p> : null}

      {!loaded && !error ? <p className={styles.muted}>Loading settings…</p> : null}

      <div className={styles.grid}>
        <Card>
          <CardHead title="Site identity" />
          <div className={styles.body}>
            <label className={styles.field}>
              <span>Site name</span>
              <input value={form.identity.siteName} onChange={(e) => patch("identity", { siteName: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Header wordmark</span>
              <input value={form.identity.wordmark} onChange={(e) => patch("identity", { wordmark: e.target.value })} />
              <em>Shown top-left on every public page.</em>
            </label>
            <label className={styles.field}>
              <span>Profile picture URL</span>
              <input value={form.identity.avatarUrl} onChange={(e) => patch("identity", { avatarUrl: e.target.value })} />
              <em>Used in the header, footer and article bylines.</em>
            </label>
            <label className={styles.field}>
              <span>Tagline</span>
              <input value={form.identity.tagline} onChange={(e) => patch("identity", { tagline: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Contact email</span>
              <input type="email" value={form.identity.email} onChange={(e) => patch("identity", { email: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Location</span>
              <input value={form.identity.location} onChange={(e) => patch("identity", { location: e.target.value })} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHead title="Home hero" />
          <div className={styles.body}>
            <label className={styles.field}>
              <span>Hero title</span>
              <em>Used on the home page when there are no published posts.</em>
              <input value={form.hero.title} onChange={(e) => patch("hero", { title: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Standfirst</span>
              <textarea rows={3} value={form.hero.standfirst} onChange={(e) => patch("hero", { standfirst: e.target.value })} />
            </label>
          </div>
        </Card>

        <Card>
          <CardHead title="Publishing" />
          <div className={styles.body}>
            <Toggle
              label="Newsletter signup"
              hint="Show the subscribe block on the home page and the newsletter link in navigation."
              checked={form.toggles.newsletter}
              onChange={(v) => patch("toggles", { newsletter: v })}
            />
            <Toggle
              label="Comments"
              hint="Moderated comments appear under posts when enabled."
              checked={form.toggles.comments}
              onChange={(v) => patch("toggles", { comments: v })}
            />
            <Toggle
              label="View counting"
              hint="Count article reads for the analytics dashboard."
              checked={form.toggles.views}
              onChange={(v) => patch("toggles", { views: v })}
            />
            <Toggle
              label="Contact form"
              hint="Accept messages from readers into the studio inbox."
              checked={form.toggles.contactForm}
              onChange={(v) => patch("toggles", { contactForm: v })}
            />
          </div>
        </Card>

        <Card className={styles.full}>
          <CardHead title="Top bar & navigation" />
          <div className={styles.body}>
            <ListEditor label="Nav items" hint="Top-bar links (Blog, Topics, Gallery, About…)" items={form.nav} onChange={(nav) => { setForm((f) => ({ ...f, nav })); setSaved(false); }} />
            <ListEditor label="Footer links" hint="Small links row at the bottom of every page" items={form.footerLinks} onChange={(footerLinks) => { setForm((f) => ({ ...f, footerLinks })); setSaved(false); }} />
            <ListEditor label="Social links" hint="Icons in the footer" items={form.socials} onChange={(socials) => { setForm((f) => ({ ...f, socials })); setSaved(false); }} />
          </div>
        </Card>

        <Card className={styles.full}>
          <CardHead title="Backup" />
          <div className={styles.danger}>
            <div>
              <p className={styles.intName}>Export Studio data</p>
              <p className={styles.intDesc}>
                Download posts, topics, authors, albums, photos, subscribers and settings as a JSON file.
              </p>
              {backupError ? <p role="alert" className={styles.formError}>{backupError}</p> : null}
            </div>
            <Button variant="outlined" disabled={backupBusy} onClick={() => void exportBackup()}>
              {backupBusy ? "Preparing…" : "Export JSON backup"}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={styles.toggle}>
      <span>
        <span className={styles.toggleLabel}>{label}</span>
        <span className={styles.toggleHint}>{hint}</span>
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className={styles.switch} />
    </label>
  );
}

function ListEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: { label: string; href: string }[];
  onChange: (items: { label: string; href: string }[]) => void;
}) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <em>{hint}</em>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          <input
            value={item.label}
            placeholder="Label"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <input
            value={item.href}
            placeholder="/href or https://…"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
          />
          <button type="button" className={styles.listRemove} aria-label={`Remove ${item.label}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.listAdd} onClick={() => onChange([...items, { label: "", href: "" }])}>+ Add</button>
    </div>
  );
}
