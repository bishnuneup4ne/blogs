// Migrate the old app's Supabase content into this app's fn_* tables.
// Reads blogs/.env.local (or env vars) and writes via PostgREST — no psql needed.
// Usage: node scripts/migrate-legacy.mjs [--dry]
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const root = new URL("..", import.meta.url).pathname;
for (const f of [`${root}../.env.local`, `${root}.env.local`]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
const db = createClient(url, key, { auth: { persistSession: false } });
const dry = process.argv.includes("--dry");

function slug(s) {
  return s.toLowerCase().replace(/&/g, " and ").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60);
}

function mdToBlocks(md) {
  const blocks = [];
  const lines = md.split("\n");
  let para = [];
  const flush = () => {
    if (!para.length) return;
    const text = para.join(" ").trim();
    if (text) {
      let html = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, "<em>$1</em>");
      html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
      blocks.push({ type: "p", html });
    }
    para = [];
  };
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) flush();
    else if (s.startsWith("# ")) { flush(); blocks.push({ type: "h2", text: s.slice(2).trim(), id: slug(s.slice(2)) || `h-${blocks.length}` }); }
    else if (s.startsWith("## ")) { flush(); blocks.push({ type: "h3", text: s.slice(3).trim(), id: slug(s.slice(3)) || `h-${blocks.length}` }); }
    else if (s.startsWith("> ")) { flush(); blocks.push({ type: "quote", html: s.slice(2).replace(/\*/g, "") }); }
    else if (/^[-*] /.test(s)) {
      const items = [];
      while (i < lines.length && /^[-*] /.test(lines[i].trim())) { items.push(lines[i].trim().slice(2)); i++; }
      flush(); blocks.push({ type: "list", ordered: false, items }); i--;
    } else if (s === "---" || s === "***") { flush(); blocks.push({ type: "divider" }); }
    else para.push(s);
  }
  flush();
  return blocks;
}

async function count(table) {
  const { count: n } = await db.from(table).select("id", { count: "exact", head: true });
  return n ?? -1;
}

console.log("target tables:", { posts: await count("fn_posts"), topics: await count("fn_topics"), subscribers: await count("fn_subscribers") });
if ((await count("fn_posts")) < 0) throw new Error("Run supabase.sql first (Supabase SQL editor), then re-run this script.");

const { data: writeups } = await db.from("writeups").select("*").eq("status", "Published");
let added = 0;
for (const w of writeups ?? []) {
  const payload = {
    title: w.title,
    slug: w.slug,
    summary: (w.summary || "").trim() || "An earlier note from the archive.",
    status: "published",
    topic_slug: "life",
    author_id: "bishnu",
    tags: w.tags ?? [],
    cover_url: w.featured_image_url || null,
    cover_alt: "",
    date: (w.date || "2025-01-01").slice(0, 10),
    reading_minutes: Math.max(1, Math.round((w.content || "").length / 900)),
    blocks: mdToBlocks(w.content || ""),
    featured: false,
  };
  if (dry) { console.log("[dry]", w.slug); continue; }
  const { error } = await db.from("fn_posts").upsert(payload, { onConflict: "slug", ignoreDuplicates: true });
  if (error) console.error("post fail", w.slug, error.message);
  else added++;
}
console.log("writeups migrated:", added);

const { data: cats } = await db.from("categories").select("*");
for (const c of cats ?? []) {
  if (dry) continue;
  const { error } = await db.from("fn_topics").upsert(
    { name: c.name, slug: c.slug, description: c.description || "", pastel: "gray", color: "#5f6368", sort_order: c.sort_order ?? 9 },
    { onConflict: "slug", ignoreDuplicates: true },
  );
  if (error) console.error("topic fail", c.slug, error.message);
}
console.log("categories migrated:", (cats ?? []).length);

const { data: subs } = await db.from("subscribers").select("*");
for (const s of subs ?? []) {
  if (dry) continue;
  const { error } = await db.from("fn_subscribers").upsert(
    { email: s.email, status: "subscribed", source: "Legacy newsletter" },
    { onConflict: "email", ignoreDuplicates: true },
  );
  if (error) console.error("subscriber fail", s.email, error.message);
}
console.log("subscribers migrated:", (subs ?? []).length);
console.log("done. Refresh the site — content now comes from the database.");
