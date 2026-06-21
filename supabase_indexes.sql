-- Run in Supabase SQL editor if tables already exist (safe to re-run)

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
