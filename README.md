# Field Notes — blogging

Personal + professional blog (Next.js App Router), database-backed with a
file-based fallback so the site never breaks before the DB is seeded.

## Stack

- Next.js 16 (App Router, React 19), TypeScript strict, CSS Modules (SCSS)
- Supabase (Postgres + Storage) via service-role client, server-only
- Admin studio at `/admin` protected by an HKDF-signed cookie (`PAGE_ACCESS_PASSWORD`)
- Block-based content model (paragraph, headings, quote, callout, code, list, image, table, divider) stored as `jsonb`
- Design system: blog.google tokens in `src/app/tokens.css` (Google Sans / Roboto, Material colors, pill buttons, 4/8/12/16/24 radii)

## Fast setup (5 minutes)

```bash
cp .env.example .env.local    # then edit the values — see rules below
npm install
npm run dev                   # http://localhost:3000
```

### .env.local rules

| Key | How to fill it | Gotcha |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API | — |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same page | not used by admin, keep for completeness |
| `SUPABASE_SERVICE_ROLE_KEY` | same page (reveal) | server-only; never expose to the browser |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | name of a **public** Storage bucket you create | default `images` |
| `PAGE_ACCESS_PASSWORD` | pick your own admin password | write it **without quotes** |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | optional, newsletter sends only | leave empty until needed |

Do not wrap values in double quotes — dotenv treats them as part of the value.
(The app strips stray quotes defensively, but keep the file clean.)

### Database (one-time)

1. Supabase dashboard → SQL editor → paste the whole of [`supabase/schema.sql`](./supabase/schema.sql) → Run.
   It is idempotent and creates every `fn_*` table, RLS policies, triggers and the storage bucket.
2. Restart `npm run dev`. Verify: open http://localhost:3000/admin/login, sign in with
   `PAGE_ACCESS_PASSWORD`, and Overview should show non-zero counts.
3. If any API returns `Could not find the table 'public.fn_posts' in the schema cache`:
   re-run the SQL script, then in the dashboard click the project's **API → Reload schema**
   (or just wait ~10s — PostgREST reloads automatically after DDL).

### Images

All demo images ship in the repo under `public/images/` (post covers, avatars,
gallery folders). The seed data references them by path, so nothing needs
uploading to display the demo site. For real photos:

- Upload through **Studio → Media** or **Studio → Gallery → folder → Add photo**
  (goes to the Supabase Storage bucket; the bucket must be public), or
- Drop files into `public/images/...` and reference them as `/images/<name>.jpg`.

To move an old deployment's rows into this schema:

```bash
node scripts/migrate-legacy.mjs --dry   # preview
node scripts/migrate-legacy.mjs         # apply
```

## Studio (admin)

Sign in at `/admin/login` with `PAGE_ACCESS_PASSWORD`.

| Page | What it manages |
| --- | --- |
| Overview | counts, recent activity, topic mix, latest subscribers |
| Posts | list/search/filter, drafts, publish/schedule, delete |
| New / Edit post | block editor: text, headings, quotes, callouts, code, lists, images, tables |
| Media | every cover + gallery image, upload, copy path |
| Gallery | photo folders (albums) and their photos, captions, dates |
| Comments | moderation queue (approve/spam) |
| Inbox | contact-form messages, read dialog, reply-by-email |
| Topics | category cards, pastel color, slug, order |
| Series | ordered post sequences shown on post pages and `/series/{slug}` |
| Authors | profile cards, bios, avatars |
| Subscribers | newsletter list, statuses |
| Settings | site identity, wordmark, nav/footer/social links, feature toggles, JSON backup |

## Layout

```
src/
  app/
    (site)/                public site (settings-driven header/footer)
      page.tsx             home: hero, latest posts, gallery strip, newsletter band
      blog/                feed, article, category/[slug], tag/[slug]
      categories/          all topics + tags + photo collections
      gallery/             folder-style album list + album pages
      search/ newsletter/ about/ personal/ rss.xml sitemap.ts
    admin/                 Studio (login-gated): see table above
    api/admin/*            CRUD endpoints (cookie-authenticated)
  components/
    site/                  header, footer, hero, sections, cards
    blog/                  article body, meta bar, TOC, related, share
    admin/                 shell, kit primitives, post editor, tables
  lib/                     data access, settings, auth, supabase client
  content/                 file-based demo fallbacks
supabase/schema.sql        full schema (idempotent)
scripts/migrate-legacy.mjs importer from the previous app version
```

## Commands

```bash
npm run dev        # local dev
npm run build      # production build
npm start          # serve the build
npm run typecheck  # tsc --noEmit
```
