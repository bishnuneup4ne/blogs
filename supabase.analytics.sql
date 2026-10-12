-- Run this ONCE in Supabase Dashboard → SQL Editor to enable the admin
-- analytics dashboard (read time, visitors, locations).

CREATE TABLE IF NOT EXISTS public.page_views (
  id           bigint generated always as identity primary key,
  slug         text not null,
  visitor_id   text,
  country      text,
  referrer     text,
  device       text,
  read_seconds integer not null default 0,
  max_scroll   integer not null default 0,
  created_at   timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS page_views_created_at_idx ON public.page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS page_views_slug_idx ON public.page_views (slug);

-- Speeds up the admin lists too:
CREATE INDEX IF NOT EXISTS writeups_not_deleted_idx ON public.writeups (is_deleted, created_at DESC);
CREATE INDEX IF NOT EXISTS subscribers_subscribed_at_idx ON public.subscribers (subscribed_at DESC);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Anonymous visitors may only INSERT their own read event; nobody outside the
-- service role may read the rows (the admin API uses the service key).
DROP POLICY IF EXISTS "anon insert page_views" ON public.page_views;
CREATE POLICY "anon insert page_views" ON public.page_views
  FOR INSERT TO anon WITH CHECK (true);
