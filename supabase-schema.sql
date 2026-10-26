-- ============================================================================
-- Field Notes — Supabase schema only (no seed data)
-- Tables, constraints, indexes and column comments for the blogging app.
-- Every table is prefixed fn_ so existing site tables stay untouched.
-- This file is idempotent and safe to paste into the Supabase SQL editor.
--
-- Not included here: RLS policies, functions and seed rows. Those live in
-- supabase.sql, which is also idempotent and can be run after this file.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- fn_topics — editorial categories used to group posts.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_topics (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  name text not null unique,                     -- display label, e.g. Engineering
  slug text not null unique,                     -- URL-safe key used by posts
  description text not null default '',          -- category summary
  pastel text not null default 'blue',           -- pastel tone key for UI
  color text not null default '#1a73e8',         -- accent hex colour
  sort_order int not null default 0,             -- manual ordering
  created_at timestamptz not null default now()  -- creation timestamp
);

-- ---------------------------------------------------------------------------
-- fn_authors — profile records for people who write posts.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_authors (
  id text primary key,                                  -- slug-style author id
  name text not null,                                   -- public name
  role text not null default '',                        -- short role label
  email text not null default '',                       -- contact email
  avatar_url text not null default '/avatar.jpg',-- profile image path
  short_bio text not null default '',                   -- one-line bio
  bio text not null default '',                         -- long biography
  sort_order int not null default 0,                    -- manual ordering
  created_at timestamptz not null default now()         -- creation timestamp
);

-- ---------------------------------------------------------------------------
-- fn_posts — blog posts with their rich-content block tree.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_posts (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  title text not null,                           -- post title
  slug text not null unique,                     -- URL-safe identifier
  summary text not null default '',              -- excerpt / deck
  status text not null default 'draft'
    check (status in ('draft','review','scheduled','published')), -- workflow state
  topic_slug text references public.fn_topics(slug) on delete set null, -- category
  author_id text references public.fn_authors(id) on delete set null,   -- writer
  tags text[] not null default '{}',             -- freeform tags
  cover_url text,                                -- optional cover image
  cover_alt text not null default '',            -- cover image alt text
  date date not null default current_date,       -- publication / display date
  reading_minutes int not null default 1,        -- estimated reading time
  blocks jsonb not null default '[]'::jsonb,     -- rich content blocks
  featured boolean not null default false,       -- show in featured slots
  views_total bigint not null default 0,         -- denormalised view counter
  created_at timestamptz not null default now(), -- creation timestamp
  updated_at timestamptz not null default now()  -- last edit timestamp
);
create index if not exists fn_posts_status_idx on public.fn_posts(status, date desc);
create index if not exists fn_posts_topic_idx on public.fn_posts(topic_slug);

-- ---------------------------------------------------------------------------
-- fn_series — ordered groups of posts.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_series (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  title text not null,                           -- series title
  slug text not null unique,                     -- URL-safe identifier
  description text not null default '',          -- series summary
  status text not null default 'draft'
    check (status in ('draft','live')),          -- visibility state
  created_at timestamptz not null default now()  -- creation timestamp
);

-- ---------------------------------------------------------------------------
-- fn_series_posts — join table placing posts inside a series.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_series_posts (
  series_id uuid not null references public.fn_series(id) on delete cascade, -- series
  post_id uuid not null references public.fn_posts(id) on delete cascade,    -- post
  position int not null default 0,                                            -- order
  primary key (series_id, post_id)                                            -- one post per series once
);

-- ---------------------------------------------------------------------------
-- fn_albums — photo gallery albums.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_albums (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  title text not null,                           -- album title
  slug text not null unique,                     -- URL-safe identifier
  subtitle text not null default '',             -- short subtitle
  description text not null default '',          -- album description
  year int not null default extract(year from now())::int, -- album year
  cover_url text not null default '',            -- cover image path
  sort_order int not null default 0,             -- manual ordering
  created_at timestamptz not null default now()  -- creation timestamp
);

-- ---------------------------------------------------------------------------
-- fn_photos — images and videos belonging to an album.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_photos (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  album_id uuid not null references public.fn_albums(id) on delete cascade, -- parent album
  src text not null,                             -- media path or URL
  alt text not null default '',                  -- accessibility text
  caption text not null default '',              -- visible caption
  width int not null default 1400,               -- intrinsic width in pixels
  height int not null default 933,               -- intrinsic height in pixels
  taken_at date,                                 -- capture date, optional
  camera text not null default '',               -- camera / lens label
  kind text not null default 'image'
    check (kind in ('image','video')),           -- media type
  poster_url text not null default '',           -- poster for video items
  position int not null default 0                -- order inside the album
);
create index if not exists fn_photos_album_idx on public.fn_photos(album_id, position);

-- Structural upgrades for databases created before video support existed.
alter table public.fn_photos add column if not exists kind text not null default 'image';
alter table public.fn_photos add column if not exists poster_url text not null default '';

-- ---------------------------------------------------------------------------
-- fn_subscribers — newsletter list.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_subscribers (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  email text not null unique,                    -- subscriber address
  name text not null default '',                 -- optional display name
  status text not null default 'subscribed'
    check (status in ('subscribed','pending','unsubscribed')), -- list state
  source text not null default 'Newsletter',     -- where they signed up
  joined_at timestamptz not null default now()   -- signup timestamp
);

-- ---------------------------------------------------------------------------
-- fn_messages — contact form submissions.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_messages (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  name text not null,                            -- sender name
  email text not null,                           -- sender email
  subject text not null default '',              -- message subject
  message text not null default '',              -- message body
  is_read boolean not null default false,        -- admin read state
  created_at timestamptz not null default now()  -- submission timestamp
);

-- ---------------------------------------------------------------------------
-- fn_comments — threaded comments attached to a post slug.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_comments (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  post_slug text not null,                       -- post the comment belongs to
  parent_id uuid references public.fn_comments(id) on delete cascade, -- reply target
  name text not null,                            -- commenter name
  email text not null default '',                -- commenter email
  body text not null,                            -- comment text
  status text not null default 'pending'
    check (status in ('pending','approved','spam')), -- moderation state
  created_at timestamptz not null default now()  -- submission timestamp
);
create index if not exists fn_comments_post_idx on public.fn_comments(post_slug, status);

-- ---------------------------------------------------------------------------
-- fn_reactions — one like/dislike per voter per post slug.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_reactions (
  id uuid primary key default gen_random_uuid(), -- stable identifier
  post_slug text not null,                       -- post being reacted to
  value text not null check (value in ('like','dislike')), -- reaction type
  voter text not null,                           -- anonymous voter token
  created_at timestamptz not null default now()  -- reaction timestamp
);
create index if not exists fn_reactions_post_idx on public.fn_reactions(post_slug, voter);

-- ---------------------------------------------------------------------------
-- fn_post_views — daily view counts per post.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_post_views (
  post_id uuid not null references public.fn_posts(id) on delete cascade, -- viewed post
  day date not null default current_date,                                 -- view date
  views bigint not null default 0,                                        -- views that day
  primary key (post_id, day)                                              -- one row per post per day
);

-- ---------------------------------------------------------------------------
-- fn_settings — single-row JSON settings document for the site.
-- ---------------------------------------------------------------------------
create table if not exists public.fn_settings (
  id int primary key default 1 check (id = 1),        -- singleton row
  payload jsonb not null default '{}'::jsonb,         -- site settings document
  updated_at timestamptz not null default now()       -- last update timestamp
);

-- ---------------------------------------------------------------------------
-- Table comments — stored in Postgres and visible in the Supabase dashboard.
-- ---------------------------------------------------------------------------
comment on table public.fn_topics is 'Editorial categories used to group posts.';
comment on table public.fn_authors is 'Author profiles referenced by posts.';
comment on table public.fn_posts is 'Blog posts with their rich-content block tree.';
comment on table public.fn_series is 'Ordered groups of related posts.';
comment on table public.fn_series_posts is 'Join table placing posts inside a series at a position.';
comment on table public.fn_albums is 'Photo gallery albums.';
comment on table public.fn_photos is 'Images and videos belonging to gallery albums.';
comment on table public.fn_subscribers is 'Newsletter subscriber list.';
comment on table public.fn_messages is 'Contact-form submissions.';
comment on table public.fn_comments is 'Threaded comments attached to post slugs.';
comment on table public.fn_reactions is 'One like/dislike per voter per post slug.';
comment on table public.fn_post_views is 'Daily view counts per post.';
comment on table public.fn_settings is 'Single-row JSON site settings document.';
