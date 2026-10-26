-- ============================================================
-- Comments storage — run this ONCE in Supabase dashboard:
--   Project → SQL Editor → paste everything below → Run
-- Safe to re-run. This is the only step needed to make the
-- comment form (with replies) on articles work end to end.
-- ============================================================

create table if not exists public.fn_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  parent_id uuid references public.fn_comments(id) on delete cascade,
  name text not null,
  email text not null default '',
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','spam')),
  created_at timestamptz not null default now()
);
create index if not exists fn_comments_post_idx on public.fn_comments(post_slug, status);

alter table public.fn_comments enable row level security;
drop policy if exists fn_comments_read on public.fn_comments;
create policy fn_comments_read on public.fn_comments for select using (status = 'approved');

-- Reactions (like / dislike)
create table if not exists public.fn_reactions (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  value text not null check (value in ('like','dislike')),
  voter text not null,
  created_at timestamptz not null default now()
);
create index if not exists fn_reactions_post_idx on public.fn_reactions(post_slug, voter);
alter table public.fn_reactions enable row level security;
drop policy if exists fn_reactions_read on public.fn_reactions;
create policy fn_reactions_read on public.fn_reactions for select using (true);
drop policy if exists fn_reactions_write on public.fn_reactions;
create policy fn_reactions_write on public.fn_reactions for all using (true) with check (true);
