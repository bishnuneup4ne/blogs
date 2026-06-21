-- ==========================================
-- MIGRATION: Add Subcategories Support
-- ==========================================

-- Alter categories table to add parent_id, description, and icon
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE CASCADE;

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS icon text;

-- Add constraint to prevent circular references (a category cannot be its own parent)
ALTER TABLE public.categories
ADD CONSTRAINT check_not_self_parent CHECK (id != parent_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent_sort ON public.categories(parent_id, sort_order);

