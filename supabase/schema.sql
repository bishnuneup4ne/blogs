-- ============================================================================
--  bishnuneup4ne — complete Supabase schema
--
--  Recreates every table the application queries. Safe to run on a fresh
--  project; every statement is idempotent (IF NOT EXISTS) so it can also be
--  re-run against an existing one without dropping data.
--
--  Tables (all live in the `public` schema):
--    fn_authors      site authors / bylines
--    fn_topics       categories used for pills + nav sections
--    fn_posts        articles; `blocks` holds the editor JSON
--    fn_albums       photo collections
--    fn_photos       images + videos inside an album
--    fn_comments     reader comments, threaded via parent_id
--    fn_reactions    like / dislike counts per post per voter
--    fn_post_views   daily view rollups
--    fn_subscribers  newsletter list
--    fn_messages     contact-form inbox
--    fn_settings     singleton row holding the whole site config JSON
--    fn_series       curated reading orders (live/draft)
--    fn_series_posts ordered membership of series -> posts
-- ============================================================================

create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Shared: updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.fn_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- fn_authors
-- ---------------------------------------------------------------------------
create table if not exists public.fn_authors (
  id           uuid primary key default gen_random_uuid(),
  name         text        not null,
  role         text,
  bio          text,
  short_bio    text,
  email        text,
  avatar_url   text,
  status       text        not null default 'active'
               check (status in ('active', 'inactive')),
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists fn_authors_status_idx
  on public.fn_authors (status, sort_order);

-- ---------------------------------------------------------------------------
-- fn_topics
-- ---------------------------------------------------------------------------
create table if not exists public.fn_topics (
  id           uuid primary key default gen_random_uuid(),
  slug         text        not null unique,
  name         text        not null,
  description  text        not null default '',
  color        text,
  pastel       text        not null default 'blue'
               check (pastel in ('blue', 'green', 'mint', 'yellow', 'red', 'purple', 'gray')),
  image_url    text,
  shape        text        not null default 'circle'
               check (shape in ('circle', 'squircle', 'leaf', 'blob', 'petal')),
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

-- Existing databases: run these once to add the topic image + shape columns.
alter table public.fn_topics add column if not exists image_url text;
alter table public.fn_topics add column if not exists shape text not null default 'circle';

create index if not exists fn_topics_sort_idx
  on public.fn_topics (sort_order, name);

-- ---------------------------------------------------------------------------
-- fn_posts
--   blocks: JSON array of editor blocks. Shape depends on `type`:
--     { type: "p" | "quote" | "callout", html }
--     { type: "h2" | "h3", text, id }
--     { type: "image", src, alt, caption?, width? }
--     { type: "row", items: [...], columns?, caption? }
--     { type: "video", url, poster?, caption? }
--     { type: "code", lang, code, filename? }
--     { type: "list", ordered, items }
--     { type: "table", head, rows }
--     { type: "chart", chart }
--     { type: "related", slug, title, description?, image? }
--     { type: "cta", label, href, style?, note? }
--     { type: "footnote", text }
--     { type: "jumplinks", title? }
--     { type: "divider" }
-- ---------------------------------------------------------------------------
create table if not exists public.fn_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text        not null unique,
  title            text        not null,
  summary          text        not null default '',
  status           text        not null default 'draft'
                   check (status in ('draft', 'review', 'scheduled', 'published')),
  topic_slug       text references public.fn_topics (slug) on update cascade on delete set null,
  author_id        uuid references public.fn_authors (id) on delete set null,
  tags             text[]      not null default '{}',
  cover_url        text,
  cover_alt        text        not null default '',
  cover_height     integer,
  cover_focal      integer     check (cover_focal between 0 and 100),
  date             date        not null default current_date,
  reading_minutes  integer     not null default 1 check (reading_minutes between 1 and 240),
  blocks           jsonb       not null default '[]'::jsonb,
  featured         boolean     not null default false,
  views_total      integer     not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists fn_posts_status_date_idx
  on public.fn_posts (status, date desc);
create index if not exists fn_posts_topic_idx
  on public.fn_posts (topic_slug, date desc);
create index if not exists fn_posts_featured_idx
  on public.fn_posts (featured) where featured;
create index if not exists fn_posts_tags_idx
  on public.fn_posts using gin (tags);

drop trigger if exists fn_posts_touch on public.fn_posts;
create trigger fn_posts_touch
  before update on public.fn_posts
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- fn_series / fn_series_posts — curated reading orders
--   status 'live' shows the series on the site; membership order is explicit
--   via position (fn_series_posts has no natural ordering otherwise).
-- ---------------------------------------------------------------------------
create table if not exists public.fn_series (
  id           uuid primary key default gen_random_uuid(),
  slug         text        not null unique,
  title        text        not null,
  description  text        not null default '',
  cover_url    text,
  status       text        not null default 'draft'
               check (status in ('draft', 'live')),
  created_at   timestamptz not null default now()
);

-- Existing databases: run this once to add the cover column.
alter table public.fn_series add column if not exists cover_url text;

create index if not exists fn_series_status_idx
  on public.fn_series (status, created_at desc);

create table if not exists public.fn_series_posts (
  series_id  uuid        not null references public.fn_series (id) on delete cascade,
  post_id    uuid        not null references public.fn_posts (id) on delete cascade,
  position   integer     not null default 0,
  primary key (series_id, post_id)
);

create index if not exists fn_series_posts_order_idx
  on public.fn_series_posts (series_id, position);

-- ---------------------------------------------------------------------------
-- fn_albums / fn_photos
-- ---------------------------------------------------------------------------
create table if not exists public.fn_albums (
  id           uuid primary key default gen_random_uuid(),
  slug         text        not null unique,
  title        text        not null,
  subtitle     text,
  description  text,
  year         integer     not null default extract(year from now())::int,
  cover_url    text,
  sort_order   integer     not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists fn_albums_sort_idx
  on public.fn_albums (sort_order, year desc);

create table if not exists public.fn_photos (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid        not null references public.fn_albums (id) on delete cascade,
  src         text        not null,
  kind        text        not null default 'image'
              check (kind in ('image', 'video')),
  alt         text        not null default '',
  caption     text        not null default '',
  poster_url  text,
  width       integer     not null default 0,
  height      integer     not null default 0,
  camera      text,
  taken_at    date,
  position    integer     not null default 0
);

create index if not exists fn_photos_album_idx
  on public.fn_photos (album_id, position);

-- ---------------------------------------------------------------------------
-- fn_comments
-- ---------------------------------------------------------------------------
create table if not exists public.fn_comments (
  id          uuid primary key default gen_random_uuid(),
  post_slug   text        not null,
  parent_id   uuid references public.fn_comments (id) on delete cascade,
  name        text        not null,
  email       text,
  body        text        not null,
  status      text        not null default 'pending'
              check (status in ('pending', 'approved', 'spam', 'deleted')),
  created_at  timestamptz not null default now()
);

create index if not exists fn_comments_post_idx
  on public.fn_comments (post_slug, status, created_at desc);
create index if not exists fn_comments_parent_idx
  on public.fn_comments (parent_id);

-- ---------------------------------------------------------------------------
-- fn_reactions — one row per voter per post; `value` is the vote
-- ---------------------------------------------------------------------------
create table if not exists public.fn_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_slug   text        not null,
  voter       text        not null,
  value       text        not null check (value in ('like', 'dislike')),
  created_at  timestamptz not null default now(),
  unique (post_slug, voter)
);

create index if not exists fn_reactions_post_idx
  on public.fn_reactions (post_slug, value);

-- ---------------------------------------------------------------------------
-- fn_post_views — daily rollup, one row per post per day
-- ---------------------------------------------------------------------------
create table if not exists public.fn_post_views (
  post_id  uuid    not null references public.fn_posts (id) on delete cascade,
  day      date    not null default current_date,
  views    integer not null default 0,
  primary key (post_id, day)
);

create index if not exists fn_post_views_day_idx
  on public.fn_post_views (day desc);

-- ---------------------------------------------------------------------------
-- fn_subscribers
-- ---------------------------------------------------------------------------
create table if not exists public.fn_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text        not null unique,
  name       text,
  status     text        not null default 'pending'
             check (status in ('pending', 'subscribed', 'unsubscribed', 'bounced')),
  source     text        not null default 'site',
  joined_at  timestamptz not null default now()
);

create index if not exists fn_subscribers_status_idx
  on public.fn_subscribers (status, joined_at desc);

-- ---------------------------------------------------------------------------
-- fn_messages — contact form inbox
-- ---------------------------------------------------------------------------
create table if not exists public.fn_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  subject     text        not null default '',
  message     text        not null,
  is_read     boolean     not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists fn_messages_unread_idx
  on public.fn_messages (is_read, created_at desc);

-- ---------------------------------------------------------------------------
-- fn_settings — single row (id = 1) holding the site configuration JSON
--   payload mirrors the SiteSettings interface in src/lib/settings.ts:
--   { identity, hero, about, nav[], socials[], footerLinks[],
--     toggles, homeSections[] }
-- ---------------------------------------------------------------------------
create table if not exists public.fn_settings (
  id          integer primary key default 1 check (id = 1),
  payload     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

insert into public.fn_settings (id, payload)
values (1, '{}'::jsonb)
on conflict (id) do nothing;

drop trigger if exists fn_settings_touch on public.fn_settings;
create trigger fn_settings_touch
  before update on public.fn_settings
  for each row execute function public.fn_touch_updated_at();

-- ---------------------------------------------------------------------------
-- fn_increment_view — one atomic view bump per post, keyed by slug.
--   Upserts today's row in fn_post_views and keeps views_total in step.
--   Returns true when a published post was found, false otherwise.
-- ---------------------------------------------------------------------------
create or replace function public.fn_increment_view(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_post_id uuid;
begin
  select id into v_post_id
  from public.fn_posts
  where slug = p_slug and status = 'published';

  if v_post_id is null then
    return false;
  end if;

  insert into public.fn_post_views (post_id, day, views)
  values (v_post_id, current_date, 1)
  on conflict (post_id, day) do update
    set views = public.fn_post_views.views + 1;

  update public.fn_posts
     set views_total = views_total + 1
   where id = v_post_id;

  return true;
end;
$$;

revoke all on function public.fn_increment_view(text) from public, anon, authenticated;
grant execute on function public.fn_increment_view(text) to service_role;

-- ---------------------------------------------------------------------------
-- fn_rewrites — old -> new URLs after a slug rename. The proxy 301s anything
--   matching from_path (chain-followed), and the admin API records rows here
--   whenever a post/topic/series slug changes.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_rewrites (
  id          uuid primary key default gen_random_uuid(),
  kind        text        not null default 'post'
              check (kind in ('post', 'topic', 'series')),
  from_path   text        not null,
  to_path     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists fn_rewrites_from_idx
  on public.fn_rewrites (from_path, created_at desc);

alter table public.fn_rewrites enable row level security;

-- Service-role only: no public policy, so anon/authenticated see nothing.

-- ============================================================================
--  Row Level Security
--
--  The application talks to these tables with the service-role key from
--  server components and API routes, which bypasses RLS. Public read access is
--  granted per table below; writes are service-role only.
-- ============================================================================

alter table public.fn_authors     enable row level security;
alter table public.fn_topics      enable row level security;
alter table public.fn_posts       enable row level security;
alter table public.fn_albums      enable row level security;
alter table public.fn_photos      enable row level security;
alter table public.fn_comments    enable row level security;
alter table public.fn_reactions   enable row level security;
alter table public.fn_post_views  enable row level security;
alter table public.fn_series      enable row level security;
alter table public.fn_series_posts enable row level security;
alter table public.fn_subscribers enable row level security;
alter table public.fn_messages    enable row level security;
alter table public.fn_settings    enable row level security;

-- Published content is world-readable.
drop policy if exists "published posts are public" on public.fn_posts;
create policy "published posts are public"
  on public.fn_posts for select
  using (status = 'published');

drop policy if exists "topics are public" on public.fn_topics;
create policy "topics are public"
  on public.fn_topics for select using (true);

drop policy if exists "active authors are public" on public.fn_authors;
create policy "active authors are public"
  on public.fn_authors for select using (status = 'active');

drop policy if exists "albums are public" on public.fn_albums;
create policy "albums are public"
  on public.fn_albums for select using (true);

drop policy if exists "photos are public" on public.fn_photos;
create policy "photos are public"
  on public.fn_photos for select using (true);

-- Approved comments are readable.
drop policy if exists "approved comments are public" on public.fn_comments;
create policy "approved comments are public"
  on public.fn_comments for select
  using (status = 'approved');

-- Reaction totals are readable; inserts come through the API.
drop policy if exists "reactions are public" on public.fn_reactions;
create policy "reactions are public"
  on public.fn_reactions for select using (true);

-- Live series and their membership are readable.
drop policy if exists "live series are public" on public.fn_series;
create policy "live series are public"
  on public.fn_series for select
  using (status = 'live');

drop policy if exists "series posts are public" on public.fn_series_posts;
create policy "series posts are public"
  on public.fn_series_posts for select using (true);

-- Subscriber list, inbox and settings are service-role only (no public policy).

-- ============================================================================
--  Storage
--  Public bucket for uploads referenced by fn_posts.cover_url and fn_photos.src
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

drop policy if exists "images are publicly readable" on storage.objects;
create policy "images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'images');
