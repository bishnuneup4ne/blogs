"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/components/admin/api";
import { Button } from "@/components/admin/Button";
import { useToast } from "@/components/admin/Feedback";
import { Card, CardHead, PageHeader } from "@/components/admin/kit";
import { SocialIcon } from "@/components/icons/Icons";
import styles from "./settings.module.scss";

const SOCIAL_ICONS = ["github", "linkedin", "x", "instagram", "youtube", "facebook", "threads", "email"] as const;

interface AboutEntry { label?: string; value?: string; year?: string; title?: string; body?: string }

interface SettingsForm {
  identity: { wordmark: string; siteName: string; tagline: string; email: string; location: string; avatarUrl: string; authorName: string };
  hero: { title: string; standfirst: string };
  socials: { label: string; href: string; icon?: string }[];
  toggles: { newsletter: boolean; comments: boolean; views: boolean; contactForm: boolean; toc: boolean };
  nav: { label: string; href: string }[];
  footerLinks: { label: string; href: string }[];
  about: { kicker: string; title: string; lede: string; quote: string; portraitUrl: string; portraitAlt: string; focus: string[]; story: string[]; now: AboutEntry[]; timeline: AboutEntry[]; updated: string };
}

const BLANK: SettingsForm = {
  identity: { wordmark: "", siteName: "", tagline: "", email: "", location: "", avatarUrl: "", authorName: "" },
  hero: { title: "", standfirst: "" },
  socials: [],
  toggles: { newsletter: true, comments: true, views: true, contactForm: true, toc: true },
  nav: [],
  footerLinks: [],
  about: { kicker: "About", title: "", lede: "", quote: "", portraitUrl: "", portraitAlt: "", focus: [], story: [], now: [], timeline: [], updated: "" },
};

export default function AdminSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState<SettingsForm>(BLANK);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupError, setBackupError] = useState("");

  useEffect(() => {
    api.get<{ payload: SettingsForm }>("/api/admin/settings")
      .then((d) => setForm({ ...BLANK, ...d.payload, identity: { ...BLANK.identity, ...d.payload?.identity }, toggles: { ...BLANK.toggles, ...d.payload?.toggles }, about: { ...BLANK.about, ...d.payload?.about } }))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load settings"))
      .finally(() => setLoaded(true));
  }, []);

  async function persist(next: SettingsForm) {
    setBusy(true);
    setError("");
    try {
      await api.put("/api/admin/settings", next);
      toast("Settings saved", "success");
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
            <UploadField label="Upload profile picture" accept="image/*" onUploaded={(src) => patch("identity", { avatarUrl: src })} />
            <label className={styles.field}>
              <span>Tagline</span>
              <input value={form.identity.tagline} onChange={(e) => patch("identity", { tagline: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Contact email</span>
              <input type="email" value={form.identity.email} onChange={(e) => patch("identity", { email: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Author name</span>
              <input value={form.identity.authorName} onChange={(e) => patch("identity", { authorName: e.target.value })} />
              <em>Your display name across the site (About greeting, bylines).</em>
            </label>
            <label className={styles.field}>
              <span>Location</span>
              <input value={form.identity.location} onChange={(e) => patch("identity", { location: e.target.value })} />
            </label>
          </div>
        </Card>

        <Card className={styles.full}>
          <CardHead title="About page" />
          <div className={styles.body}>
            <div className={styles.twoCol}>
              <label className={styles.field}>
                <span>Kicker</span>
                <input value={form.about.kicker} onChange={(e) => patch("about", { kicker: e.target.value })} />
              </label>
              <label className={styles.field}>
                <span>Updated note</span>
                <input placeholder="October 2026" value={form.about.updated} onChange={(e) => patch("about", { updated: e.target.value })} />
              </label>
            </div>
            <label className={styles.field}>
              <span>Title</span>
              <input value={form.about.title} onChange={(e) => patch("about", { title: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Lede</span>
              <textarea rows={4} value={form.about.lede} onChange={(e) => patch("about", { lede: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span>Quote</span>
              <input value={form.about.quote} onChange={(e) => patch("about", { quote: e.target.value })} />
            </label>
            <div className={styles.twoCol}>
              <label className={styles.field}>
                <span>Portrait URL</span>
                <input value={form.about.portraitUrl} onChange={(e) => patch("about", { portraitUrl: e.target.value })} />
                <em>Shown to the right of the About headline. Leave empty to hide.</em>
              </label>
              <label className={styles.field}>
                <span>Portrait alt text</span>
                <input value={form.about.portraitAlt} onChange={(e) => patch("about", { portraitAlt: e.target.value })} />
              </label>
            </div>
            <UploadField label="Upload About portrait" accept="image/*" onUploaded={(src) => patch("about", { portraitUrl: src })} />
            <label className={styles.field}>
              <span>Focus pills</span>
              <em>One per line — Malware analysis, Reverse engineering…</em>
              <textarea rows={4} value={form.about.focus.join("\n")} onChange={(e) => patch("about", { focus: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })} />
            </label>
            <label className={styles.field}>
              <span>Story paragraphs</span>
              <em>One paragraph per blank line.</em>
              <textarea rows={5} value={form.about.story.join("\n\n")} onChange={(e) => patch("about", { story: e.target.value.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean) })} />
            </label>
            <EntryEditor label="Now list" hint="Label + value rows under “Now”." items={form.about.now} keys={[["label", "Label"], ["value", "Value"]]} onChange={(now) => patch("about", { now })} />
            <EntryEditor label="Timeline" hint="Year, title and body for each milestone." items={form.about.timeline} keys={[["year", "Year"], ["title", "Title"], ["body", "Body"]]} onChange={(timeline) => patch("about", { timeline })} />
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
              label="Table of contents"
              hint="Show the “In this article” panel beside posts when they have headings."
              checked={form.toggles.toc !== false}
              onChange={(v) => patch("toggles", { toc: v })}
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
            <LinkEditor label="Nav items" hint="Top-bar links (Blog, Topics, Gallery, About…) — optional leading icon" items={form.nav} onChange={(nav) => { setForm((f) => ({ ...f, nav })); setSaved(false); }} />
            <LinkEditor label="Footer links" hint="Text links in the footer — pick an icon or leave it as a plain link" items={form.footerLinks} onChange={(footerLinks) => { setForm((f) => ({ ...f, footerLinks })); setSaved(false); }} />
            <SocialEditor items={form.socials} onChange={(socials) => { setForm((f) => ({ ...f, socials })); setSaved(false); }} />
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

type LinkItem = { label: string; href: string; icon?: string };

function LinkEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint: string;
  items: LinkItem[];
  onChange: (items: LinkItem[]) => void;
}) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <em>{hint}</em>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          <select
            value={item.icon || ""}
            aria-label={`Icon for ${item.label || "link"} ${i + 1}`}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
          >
            <option value="">no icon</option>
            {SOCIAL_ICONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
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
          {item.icon ? <SocialIcon name={item.icon} width={18} height={18} /> : null}
          <button type="button" className={styles.listRemove} aria-label={`Remove ${item.label}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.listAdd} onClick={() => onChange([...items, { label: "", href: "" }])}>+ Add</button>
    </div>
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

function EntryEditor({
  label,
  hint,
  items,
  keys,
  onChange,
}: {
  label: string;
  hint: string;
  items: AboutEntry[];
  keys: [keyof AboutEntry, string][];
  onChange: (items: AboutEntry[]) => void;
}) {
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <em>{hint}</em>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          {keys.map(([k, ph]) => (
            <input
              key={k}
              value={(item[k] as string) ?? ""}
              placeholder={ph}
              onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
            />
          ))}
          <button type="button" className={styles.listRemove} aria-label={`Remove ${String(item[keys[0][0]] ?? label)}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.listAdd} onClick={() => onChange([...items, {}])}>+ Add</button>
    </div>
  );
}

function UploadField({ label, accept, onUploaded }: { label: string; accept: string; onUploaded: (src: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className={styles.field}>
      <span>{label}</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Button variant="outlined" disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? "Uploading…" : "Choose file…"}
        </Button>
        {error ? <em style={{ color: "#d93025" }}>{error}</em> : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          setError("");
          try {
            const r = await api.upload(f);
            onUploaded(r.src);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
          } finally {
            setBusy(false);
            if (inputRef.current) inputRef.current.value = "";
          }
        }}
      />
    </div>
  );
}

function guessIcon(label: string, href: string): string {
  const l = `${label} ${href}`.toLowerCase();
  if (l.includes("git")) return "github";
  if (l.includes("thread")) return "threads";
  if (l.includes("linked")) return "linkedin";
  if (l.includes("insta")) return "instagram";
  if (l.includes("youtube") || l.includes("youtu.be")) return "youtube";
  if (l.includes("face")) return "facebook";
  if (l.includes("mail")) return "email";
  if (/(^|\W)x(\W|$)/.test(l) || l.includes("twitter")) return "x";
  return "email";
}

function SocialEditor({ items, onChange }: { items: SettingsForm["socials"]; onChange: (items: SettingsForm["socials"]) => void }) {
  return (
    <div className={styles.field}>
      <span>Social links</span>
      <em>Pick the icon yourself — it no longer guesses from the label.</em>
      {items.map((item, i) => (
        <div key={i} className={styles.listRow}>
          <select
            value={item.icon || ""}
            aria-label={`Icon for ${item.label || "link"} ${i + 1}`}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, icon: e.target.value } : x)))}
          >
            <option value="">auto</option>
            {SOCIAL_ICONS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            value={item.label}
            placeholder="Label"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
          />
          <input
            value={item.href}
            placeholder="https://… or mailto:…"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))}
          />
          <SocialIcon name={item.icon || guessIcon(item.label, item.href)} width={18} height={18} />
          <button type="button" className={styles.listRemove} aria-label={`Remove ${item.label || "link"}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <button type="button" className={styles.listAdd} onClick={() => onChange([...items, { label: "", href: "" }])}>+ Add</button>
    </div>
  );
}
