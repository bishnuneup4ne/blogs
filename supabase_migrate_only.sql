-- Run this if you already ran the main schema and only need categories + indexes.
-- Safe to re-run (uses IF NOT EXISTS / DROP IF EXISTS).

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON public.categories;
CREATE POLICY "Categories are viewable by everyone." ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role full access categories" ON public.categories;
CREATE POLICY "Service role full access categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.writeups ADD COLUMN IF NOT EXISTS video_url text;

CREATE INDEX IF NOT EXISTS idx_writeups_published_list
  ON public.writeups (created_at DESC)
  WHERE is_deleted = false AND status = 'Published';

CREATE INDEX IF NOT EXISTS idx_writeups_category_published
  ON public.writeups (category)
  WHERE is_deleted = false AND status = 'Published';

CREATE INDEX IF NOT EXISTS idx_writeups_slug
  ON public.writeups (slug)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_categories_nav_order
  ON public.categories (sort_order ASC, name ASC);

CREATE INDEX IF NOT EXISTS idx_projects_published_list
  ON public.projects (created_at DESC)
  WHERE is_deleted = false AND status = 'Published';

INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('News', 'news', 0),
  ('Personal', 'personal', 1),
  ('Gallery', 'gallery', 2)
ON CONFLICT (name) DO NOTHING;
