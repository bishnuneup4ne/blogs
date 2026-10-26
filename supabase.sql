-- ============================================================================
-- Field Notes — Supabase schema (blogging app)
-- Idempotent: safe to paste into the Supabase SQL editor repeatedly.
-- All tables are prefixed fn_ so the old site's tables stay untouched.
-- Seeds topics, authors, posts, albums/photos and settings from current content.
-- ============================================================================

-- ---------- topics ----------
create table if not exists public.fn_topics (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  pastel text not null default 'blue',
  color text not null default '#1a73e8',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- authors ----------
create table if not exists public.fn_authors (
  id text primary key,
  name text not null,
  role text not null default '',
  email text not null default '',
  avatar_url text not null default '/avatar.jpg',
  short_bio text not null default '',
  bio text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- posts ----------
create table if not exists public.fn_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text not null default '',
  status text not null default 'draft' check (status in ('draft','review','scheduled','published')),
  topic_slug text references public.fn_topics(slug) on delete set null,
  author_id text references public.fn_authors(id) on delete set null,
  tags text[] not null default '{}',
  cover_url text,
  cover_alt text not null default '',
  date date not null default current_date,
  reading_minutes int not null default 1,
  blocks jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  views_total bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fn_posts_status_idx on public.fn_posts(status, date desc);
create index if not exists fn_posts_topic_idx on public.fn_posts(topic_slug);

-- ---------- series ----------
create table if not exists public.fn_series (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft','live')),
  created_at timestamptz not null default now()
);
create table if not exists public.fn_series_posts (
  series_id uuid not null references public.fn_series(id) on delete cascade,
  post_id uuid not null references public.fn_posts(id) on delete cascade,
  position int not null default 0,
  primary key (series_id, post_id)
);

-- ---------- gallery ----------
create table if not exists public.fn_albums (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text not null default '',
  description text not null default '',
  year int not null default extract(year from now())::int,
  cover_url text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table if not exists public.fn_photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references public.fn_albums(id) on delete cascade,
  src text not null,
  alt text not null default '',
  caption text not null default '',
  width int not null default 1400,
  height int not null default 933,
  taken_at date,
  camera text not null default '',
  kind text not null default 'image' check (kind in ('image','video')),
  poster_url text not null default '',
  position int not null default 0
);
create index if not exists fn_photos_album_idx on public.fn_photos(album_id, position);

-- video support (safe to re-run)
alter table public.fn_photos add column if not exists kind text not null default 'image';
alter table public.fn_photos add column if not exists poster_url text not null default '';

-- ---------- subscribers / messages / comments ----------
create table if not exists public.fn_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  status text not null default 'subscribed' check (status in ('subscribed','pending','unsubscribed')),
  source text not null default 'Newsletter',
  joined_at timestamptz not null default now()
);
create table if not exists public.fn_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null default '',
  message text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
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

-- ---------- analytics ----------
create table if not exists public.fn_post_views (
  post_id uuid not null references public.fn_posts(id) on delete cascade,
  day date not null default current_date,
  views bigint not null default 0,
  primary key (post_id, day)
);

-- ---------- settings ----------
create table if not exists public.fn_settings (
  id int primary key default 1 check (id = 1),
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.fn_topics enable row level security;
alter table public.fn_authors enable row level security;
alter table public.fn_posts enable row level security;
alter table public.fn_series enable row level security;
alter table public.fn_series_posts enable row level security;
alter table public.fn_albums enable row level security;
alter table public.fn_photos enable row level security;
alter table public.fn_subscribers enable row level security;
alter table public.fn_messages enable row level security;
alter table public.fn_comments enable row level security;
alter table public.fn_post_views enable row level security;
alter table public.fn_settings enable row level security;

drop policy if exists fn_topics_read on public.fn_topics;
create policy fn_topics_read on public.fn_topics for select using (true);
drop policy if exists fn_authors_read on public.fn_authors;
create policy fn_authors_read on public.fn_authors for select using (true);
drop policy if exists fn_posts_read on public.fn_posts;
create policy fn_posts_read on public.fn_posts for select using (status = 'published');
drop policy if exists fn_series_read on public.fn_series;
create policy fn_series_read on public.fn_series for select using (status = 'live');
drop policy if exists fn_series_posts_read on public.fn_series_posts;
create policy fn_series_posts_read on public.fn_series_posts for select using (true);
drop policy if exists fn_albums_read on public.fn_albums;
create policy fn_albums_read on public.fn_albums for select using (true);
drop policy if exists fn_photos_read on public.fn_photos;
create policy fn_photos_read on public.fn_photos for select using (true);
drop policy if exists fn_settings_read on public.fn_settings;
create policy fn_settings_read on public.fn_settings for select using (true);
drop policy if exists fn_comments_read on public.fn_comments;
create policy fn_comments_read on public.fn_comments for select using (status = 'approved');
drop policy if exists fn_comments_insert on public.fn_comments;
drop policy if exists fn_subscribers_insert on public.fn_subscribers;
drop policy if exists fn_messages_insert on public.fn_messages;
drop policy if exists fn_post_views_write on public.fn_post_views;
drop policy if exists fn_post_views_upd on public.fn_post_views;

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

  return true;
end;
$$;

revoke all on function public.fn_increment_view(text) from public, anon, authenticated;
grant execute on function public.fn_increment_view(text) to service_role;

-- ---------- seed: topics ----------
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Engineering', 'engineering', 'Architecture decisions, performance work and the tools I keep coming back to.', 'blue', '#1a73e8', 0) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Security', 'security', 'AppSec, offensive tooling and post-mortems from things that should never have shipped.', 'red', '#d93025', 1) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Field notes', 'field-notes', 'Short, unpolished observations from a week of building. Less essay, more notebook.', 'green', '#188038', 2) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Life', 'life', 'Training, travel, books and the discipline of staying curious outside the terminal.', 'yellow', '#b06000', 3) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Photography', 'photography', 'Frames from Kathmandu, the trail, and whatever light happens to find me.', 'purple', '#8430ce', 4) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Essays', 'essays', 'Longer arguments about craft, attention and building things that outlast a trend.', 'green', '#0b8043', 5) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Hardware', 'hardware', 'Teardowns, home-lab gear and the physical layer.', 'purple', '#8430ce', 7) on conflict (slug) do nothing;
insert into public.fn_topics (name, slug, description, pastel, color, sort_order) values ('Personal', 'personal', 'Notes that used to live on the old site — kept in the archive.', 'gray', '#5f6368', 8) on conflict (slug) do nothing;

-- ---------- seed: authors ----------
insert into public.fn_authors (id, name, role, email, avatar_url, short_bio, bio, sort_order) values ('bishnu', 'Bishnu Neupane', 'Security Newsroom', 'contact@bishnuneupane13.com.np', '/avatar.jpg', 'Security engineer in Kathmandu. Writes about application security, incident response and the systems that hold them up.', 'Bishnu is a security engineer in Kathmandu working on application security and incident response for a fintech platform. He spends his days breaking systems so they can be made safer, and his evenings writing down what he learned — architecture decisions, postmortems, small tools. Outside work he keeps field notes from the trail and a camera within reach.', 0) on conflict (id) do nothing;

-- ---------- seed: posts ----------
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Observability that earns its keep', 'observability-that-earns-its-keep', 'Most dashboards are decoration. Here is the small set of signals that actually helped me debug production, and how we cut our bill by 62% without losing them.', 'published', 'engineering', 'bishnu', array['Observability','OpenTelemetry','Performance','Postgres'], null, 'Server racks with glowing status LEDs', '2026-10-21'::date, 9, '[{"type": "p", "html": "For two years our dashboards were a museum. Beautiful, expensive, and only ever opened after an incident. When we finally audited them we found 412 metrics, of which <strong>nine</strong> had been looked at in the last quarter."}, {"type": "p", "html": "This is the story of deleting most of it, keeping the nine, and learning what observability is actually for."}, {"type": "callout", "tone": "note", "html": "This is a demo post. Every number below is illustrative, but the workflow is exactly the one I use on real systems."}, {"type": "h2", "text": "Start from questions, not metrics", "id": "start-from-questions-not-metrics"}, {"type": "p", "html": "The mistake is starting with what the tool can collect. Start instead with the questions you want to answer at 3am:"}, {"type": "list", "ordered": true, "items": ["Is the system up, and is it <em>half</em> up?", "Which dependency is slow, and is it slow for everyone or just one tenant?", "Did this change since the last deploy?", "Is the user <em>experience</em> degraded even though every individual service looks healthy?"]}, {"type": "p", "html": "Everything that does not serve one of those questions gets a one-way trip to the archive. If we need it later, we can add it back with a story attached."}, {"type": "h2", "text": "The nine signals we kept", "id": "the-nine-signals-we-kept"}, {"type": "table", "head": ["Signal", "Type", "Answers"], "rows": [["Edge request p95 / p99", "Histogram", "Is it slow for users?"], ["Error rate by route", "Counter", "Is it broken, and where?"], ["Saturation (CPU, conn pool, queue depth)", "Gauge", "Are we about to fall over?"], ["Queue lag seconds", "Gauge", "Is work backing up?"], ["DB query p95 by operation", "Histogram", "Is the database the culprit?"], ["Cache hit ratio", "Gauge", "Are we paying for the same query twice?"], ["Deploy marker", "Event", "What changed?"], ["Feature flag state", "Event", "Who saw the change?"], ["Business funnel completion", "Counter", "Is anyone finishing the thing?"]]}, {"type": "callout", "tone": "tip", "html": "Attach the deploy marker and feature-flag state to every chart. Half of debugging is aligning a red line with a change."}, {"type": "h2", "text": "Instrumentation you can read", "id": "instrumentation-you-can-read"}, {"type": "p", "html": "I keep a single, boring wrapper around the OpenTelemetry tracer so every span gets the same attributes. If you have to remember how to instrument something, you will skip it."}, {"type": "code", "lang": "typescript", "filename": "src/lib/tracing.ts", "code": "import { trace, SpanStatusCode } from \"@opentelemetry/api\";\n\nconst tracer = trace.getTracer(\"api\");\n\nexport async function withSpan<T>(\n  name: string,\n  attrs: Record<string, string | number>,\n  fn: () => Promise<T>,\n): Promise<T> {\n  return tracer.startActiveSpan(name, { attributes: attrs }, async (span) => {\n    try {\n      const result = await fn();\n      span.setStatus({ code: SpanStatusCode.OK });\n      return result;\n    } catch (err) {\n      span.recordException(err as Error);\n      span.setStatus({ code: SpanStatusCode.ERROR });\n      throw err;\n    } finally {\n      span.end();\n    }\n  });\n}"}, {"type": "p", "html": "Call sites stay obvious at review time:"}, {"type": "code", "lang": "typescript", "code": "const invoices = await withSpan(\n  \"invoices.list\",\n  { \"tenant.id\": tenantId, \"user.id\": userId },\n  () => db.invoice.findMany({ where: { tenantId } }),\n);"}, {"type": "h2", "text": "Cardinality is the bill", "id": "cardinality-is-the-bill"}, {"type": "p", "html": "The reason our bill exploded was unbounded attributes. A <code>user.id</code> on every span is a new time series per user. The fix is not to stop attributing — it is to bucket."}, {"type": "code", "lang": "typescript", "code": "// Before: one time series per user id\nspan.setAttribute(\"user.id\", userId);\n\n// After: buckets you can reason about\nspan.setAttribute(\"user.tier\", user.tier);          // free | pro | team\nspan.setAttribute(\"user.signup_cohort\", cohortOf(user)); // 2026-Q1, ...\nspan.setAttribute(\"user.id_bucket\", hashToBucket(userId, 32));"}, {"type": "callout", "tone": "warning", "html": "Never put raw identifiers, emails, or request bodies on spans. Trace backends are queryable by everyone on the team, and PII spreads."}, {"type": "image", "src": "/images/gallery/trail-2.jpg", "alt": "Cloud filling a mountain valley at sunrise", "caption": "A quiet morning is the best trace viewer. Every span above came from one of these."}, {"type": "h2", "text": "The 62% cleanup", "id": "the-62-cleanup"}, {"type": "list", "ordered": false, "items": ["Dropped 403 low-value metrics (92% of the bill, 0% of the value).", "Sampled traces at 10% success / 100% error, with a sticky key so a user''s traces are complete.", "Moved long-term retention from 90 days to 14 days, keeping rollups forever.", "Added one shared dashboard per service, owned by a named person."]}, {"type": "quote", "html": "If nobody knows who owns a dashboard, nobody will fix it. Ownership is part of the signal."}, {"type": "h2", "text": "What I would do differently", "id": "what-i-would-do-differently"}, {"type": "p", "html": "I would have started with the incident review template. Every time an alert is sent, the on-call should be able to say <em>which chart</em> they opened first. That list is your real observability spec — everything else is ceremony."}, {"type": "divider"}, {"type": "p", "html": "If you are running a small team, spend the budget on sampling and ownership before you spend it on more vendors. The tooling is rarely the bottleneck."}]'::jsonb, true)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('One red network port, six hours, three lessons', 'one-red-network-port', 'A quiet incident that looked like a DDoS, felt like a database outage, and ended up being a single misconfigured link. A walk through the timeline and the fixes.', 'published', 'security', 'bishnu', array['Incident Response','Networking','SRE'], null, 'Ethernet cables plugged into a network switch', '2026-10-14'::date, 8, '[{"type": "p", "html": "At 02:14 the alert fired: error rate above 5% for the checkout route. By 02:20 the graph looked like a DDoS. By 03:00 it looked like a database outage. It was neither."}, {"type": "callout", "tone": "note", "html": "Names and numbers are fictionalised for this demo post. The shape of the incident is real and common."}, {"type": "h2", "text": "Timeline", "id": "timeline"}, {"type": "table", "head": ["Time", "Event", "Owner"], "rows": [["02:14", "Error rate alert, 5.2%", "On-call"], ["02:19", "DB connection pool saturated", "On-call"], ["02:41", "Failover to read replica, no change", "On-call + DBA"], ["03:10", "Traffic looks doubled from one /16", "Security"], ["04:05", "Discovered retry storm, capped it", "Platform"], ["05:48", "Root cause: one link at 100% loss", "Network"], ["06:22", "Fix deployed, error rate 0.1%", "All"]]}, {"type": "h2", "text": "Lesson one: retries are an amplifier", "id": "lesson-one-retries-are-an-amplifier"}, {"type": "p", "html": "A healthy retry policy sent three attempts per failed request with no jitter. One flaky link became a flood of work. Exponential backoff with jitter turned a wall of traffic into a polite knock."}, {"type": "code", "lang": "typescript", "code": "export async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {\n  for (let i = 0; i < attempts; i++) {\n    try {\n      return await fn();\n    } catch (err) {\n      if (i === attempts - 1) throw err;\n      const backoff = Math.min(2 ** i * 200, 4_000);\n      const jitter = Math.random() * backoff * 0.5;\n      await new Promise((r) => setTimeout(r, backoff + jitter));\n    }\n  }\n  throw new Error(\"unreachable\");\n}"}, {"type": "h2", "text": "Lesson two: a circuit breaker is a courtesy", "id": "lesson-two-a-circuit-breaker-is-a-courtesy"}, {"type": "p", "html": "When a dependency is failing, the kindest thing you can do is stop asking for a moment. We added a simple breaker in front of the flaky dependency."}, {"type": "code", "lang": "typescript", "code": "export class Breaker {\n  private failures = 0;\n  private openUntil = 0;\n\n  constructor(private readonly threshold = 5, private readonly cooloffMs = 10_000) {}\n\n  async run<T>(fn: () => Promise<T>): Promise<T> {\n    if (Date.now() < this.openUntil) throw new Error(\"circuit open\");\n    try {\n      const out = await fn();\n      this.failures = 0;\n      return out;\n    } catch (err) {\n      if (++this.failures >= this.threshold) {\n        this.openUntil = Date.now() + this.cooldown;\n      }\n      throw err;\n    }\n  }\n}"}, {"type": "callout", "tone": "warning", "html": "A breaker without a metric is a mystery. Emit state transitions as events so they show up next to the error rate."}, {"type": "h2", "text": "Lesson three: name the network", "id": "lesson-three-name-the-network"}, {"type": "p", "html": "The cleanest fix came from looking at switch counters. One uplink was flapping, and it happened to carry the path to the primary database''s replica. The alert we had was on the symptom; we needed a health check on the link."}, {"type": "list", "ordered": false, "items": ["Track CRC and drop counters on every uplink.", "Alert when a link is lossy for more than 30 seconds, not just when it is fully down.", "Label traces with the zone or rack so a bad path is visible as a cluster, not uniform noise."]}, {"type": "quote", "html": "The monitor you wish you had at 3am is the one to build on Monday."}, {"type": "h2", "text": "The follow-up list", "id": "the-follow-up-list"}, {"type": "list", "ordered": true, "items": ["Add jitter to every retry in the client SDK.", "Ship the breaker and its state metric.", "Add link-quality alerts.", "Write the postmortem within a week, with a named owner per action."]}, {"type": "p", "html": "Six hours is a long incident for something this small. Most of it was spent confirming what it wasn''t. The fixes are boring, and that is the point."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Reading the Himalaya in black and white', 'reading-the-himalaya-in-black-and-white', 'Why I stripped colour out of a year of mountain frames, and what it taught me about contrast, patience and being on the trail before sunrise.', 'published', 'photography', 'bishnu', array['Photography','Himalaya','Story'], null, 'Layered Himalayan ridges in morning fog', '2026-10-03'::date, 6, '[{"type": "p", "html": "Colour is generous. It forgives a flat sky and a busy frame. Black and white does not. This year I walked a section of the Ganesh Himal with one rule: convert every frame to monochrome before deciding whether it worked."}, {"type": "h2", "text": "Three frames", "id": "three-frames"}, {"type": "image", "src": "/images/gallery/trail-1.jpg", "alt": "A ridge line above the clouds", "caption": "06:12 — the first light that made it above the haze."}, {"type": "image", "src": "/images/gallery/trail-3.jpg", "alt": "A turn in a mountain trail", "caption": "A turn that hid the valley for ten minutes."}, {"type": "image", "src": "/images/gallery/trail-5.jpg", "alt": "Snow-covered peaks under a dark sky", "caption": "Night arriving with the last of the snow."}, {"type": "h2", "text": "What I learned", "id": "what-i-learned"}, {"type": "list", "ordered": false, "items": ["Contrast at the edge of the frame decides whether the eye enters. I cropped more generously in colour and learned to leave a little air.", "Texture is the detail that replaces colour. A trailline, grass, a stone wall — anything that says <em>ground</em>.", "Patience is the actual technique. Every frame here was a second attempt after the light moved."]}, {"type": "quote", "html": "In colour you photograph a place. In monochrome you photograph the shape of a place.", "cite": "A note to myself, somewhere above 3,800m"}, {"type": "p", "html": "The rest of the set lives in the gallery. I have left the colour originals in the album too, because sometimes you want to remember the sky."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Notes on typography for developers', 'notes-on-typography-for-developers', 'Small, specific decisions that make a reading page feel considered: measure, rhythm, alignment and the cheap wins that cost ten minutes.', 'published', 'engineering', 'bishnu', array['Design','Typography','Frontend'], null, 'A notebook with handwritten notes and a pen', '2026-09-24'::date, 7, '[{"type": "p", "html": "I am not a designer, but I can tell when a page is uncomfortable. Here are the handful of typographic decisions I apply to every reading page, with the before and after."}, {"type": "h2", "text": "The measure", "id": "the-measure"}, {"type": "p", "html": "A line of body text wants to be between 60 and 75 characters. On a 16px system font that is roughly 600–700px, not the full 1200px container."}, {"type": "code", "lang": "css", "filename": "post.css", "code": ".reading {\n  max-width: 68ch;      /* the readable column */\n  margin-inline: auto;\n  padding-inline: 24px;\n}\n\n.breaks-out {\n  width: min(1000px, 100%);\n  margin-inline: calc(50% - min(500px, 50%));\n}"}, {"type": "h2", "text": "Rhythm", "id": "rhythm"}, {"type": "p", "html": "Pick one unit and use it for every vertical gap. I use 8px. Headings get two units above and one below. Paragraphs get one unit. That is the entire system."}, {"type": "table", "head": ["Element", "Gap above", "Gap below"], "rows": [["h2", "48px", "16px"], ["h3", "32px", "8px"], ["p", "16px", "16px"], ["code block", "24px", "24px"]]}, {"type": "callout", "tone": "tip", "html": "If spacing feels wrong and you cannot say why, you probably have three different systems. Collapse to one."}, {"type": "h2", "text": "Contrast without darkness", "id": "contrast-without-darkness"}, {"type": "p", "html": "In dark themes, never use pure white on pure black for body copy. It is harsh. Start around #ededed on #000 and let headings be the brightest thing on the page."}, {"type": "code", "lang": "css", "code": ":root {\n  --bg: #000;\n  --text: #ededed;      /* body */\n  --text-secondary: #a1a1a1;\n  --text-muted: #6b6b6b;\n}"}, {"type": "h2", "text": "The cheap wins", "id": "the-cheap-wins"}, {"type": "list", "ordered": false, "items": ["Tabular numbers for dates and counts so things line up.", "Hanging punctuation on quotes — one line of CSS, looks expensive.", "<code>text-wrap: balance</code> on headings to stop orphans.", "<code>font-variant-numeric</code> for tables and stats."]}, {"type": "p", "html": "None of this is original. All of it is cheap. Most of what makes a page feel premium is just refusing to let three small things go unconsidered."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Deploying without fear', 'deploying-without-fear', 'How a small team moved from Friday-night deploy ceremonies to shipping several times a day, and the three guardrails that made it safe.', 'published', 'engineering', 'bishnu', array['Deploy','CI/CD','Postgres'], null, 'A developer''s desk with a laptop showing code', '2026-09-12'::date, 8, '[{"type": "p", "html": "Two years ago our deploys were an event. Someone would send a message, everyone would hold their breath, and if it went wrong we would revert and try again on Monday. Now we ship several times a day and nobody notices."}, {"type": "callout", "tone": "note", "html": "Written by a guest contributor for this demo. The practices are drawn from real teams I have worked with."}, {"type": "h2", "text": "Guardrail one: the deploy is not the risky part", "id": "guardrail-one-the-deploy-is-not-the-risky-part"}, {"type": "p", "html": "The risky part is the migration. Separate schema changes from code changes. First add, then write, then read, then delete — in that order, across deploys."}, {"type": "code", "lang": "sql", "filename": "migrations/0042_currency.sql", "code": "-- deploy 1: add the column, nullable, no default\nALTER TABLE orders ADD COLUMN currency text;\n\n-- deploy 2: backfill in batches\nUPDATE orders SET currency = ''NPR''\nWHERE id IN (SELECT id FROM orders WHERE currency IS NULL LIMIT 1000);\n\n-- deploy 3: enforce\nALTER TABLE orders ALTER COLUMN currency SET NOT NULL;"}, {"type": "callout", "tone": "warning", "html": "A migration that locks a large table will look like an outage. Get the lock timeout from the plan, not from hope."}, {"type": "h2", "text": "Guardrail two: every deploy is a labelled event", "id": "guardrail-two-every-deploy-is-a-labelled-event"}, {"type": "p", "html": "The simplest high-leverage thing we did was make deploys visible on every chart. A red line, a deploy marker, and a name. Suddenly people could answer <em>what changed</em> without asking in chat."}, {"type": "code", "lang": "bash", "code": "gh workflow run deploy.yml \\\n  --field version=\"$(git rev-parse --short HEAD)\" \\\n  --field annotate=true"}, {"type": "h2", "text": "Guardrail three: a one-command rollback", "id": "guardrail-three-a-one-command-rollback"}, {"type": "p", "html": "If rolling back is hard, people wait and hope instead. We made rollback the same button as deploy, and we practice it once a quarter."}, {"type": "list", "ordered": true, "items": ["Rollback the code to the previous image.", "Leave the additive migration in place.", "Post the incident note with the deploy marker."]}, {"type": "quote", "html": "Deploy speed is not a virtue. Reversibility is."}, {"type": "p", "html": "The result is not that we break things less. It is that breaking things is small, fast and boring. That is the whole goal."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('The quiet morning', 'the-quiet-morning', 'On getting up before the city does, the first hour without a phone, and why the best engineering decision I make all day happens at 6:40am.', 'published', 'life', 'bishnu', array['Habits','Focus','Story'], null, 'A sunrise over hills with soft light', '2026-09-01'::date, 4, '[{"type": "p", "html": "I do not usually write about routines. But the quiet morning has changed how I work more than any tool I have adopted in the last five years."}, {"type": "h2", "text": "The shape of the hour", "id": "the-shape-of-the-hour"}, {"type": "p", "html": "Tea. Notebook. No phone until I have written something down — even if it is a question I cannot answer yet. By the time the neighbourhood wakes up, the hardest decision of the day is usually already made."}, {"type": "list", "ordered": false, "items": ["6:00 — wake, no screen", "6:10 — tea, open notebook", "6:20 — write the <em>one question</em> for today", "6:50 — first run of the day, before reading anything"]}, {"type": "quote", "html": "The first hour is not about productivity. It is about having a place to stand before the day starts pushing."}, {"type": "h2", "text": "What it changed", "id": "what-it-changed"}, {"type": "p", "html": "I stopped starting the day inside someone else''s priority. The inbox is still there at 7:30. It just no longer gets to define the shape of the work."}, {"type": "image", "src": "/images/gallery/ktm-2.jpg", "alt": "The city in early morning light", "caption": "Kathmandu just after sunrise — the only hour it feels slow."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Walking the ridge in monsoon', 'walking-the-ridge-in-monsoon', 'Leaches, fog, and a view that never arrived. A short trail report from three days on the ridge, plus what I would pack differently.', 'published', 'life', 'bishnu', array['Trail','Nepal','Story'], null, 'A ridge line covered in forest and cloud', '2026-08-18'::date, 5, '[{"type": "p", "html": "Monsoon trekking is not brave. It is just wet. Three days on the ridge, two views, one very good tea stop."}, {"type": "h2", "text": "Day-by-day", "id": "day-by-day"}, {"type": "h3", "text": "Day one — up into the cloud", "id": "day-one-up-into-the-cloud"}, {"type": "p", "html": "The trail starts in jungle. Within an hour the cloud closes in and stays there. Every leaf is holding water. I stopped counting leaches after the first two."}, {"type": "h3", "text": "Day two — the ridge", "id": "day-two-the-ridge"}, {"type": "p", "html": "The only gap in the clouds opened for eleven minutes. That is the view above, and it was worth the whole walk."}, {"type": "h3", "text": "Day three — down", "id": "day-three-down"}, {"type": "p", "html": "Knees, rain, and a bus that was late by a country mile. Still better than a weekend indoors."}, {"type": "h2", "text": "What I would pack differently", "id": "what-i-would-pack-differently"}, {"type": "table", "head": ["Item", "Verdict", "Why"], "rows": [["Gore-Tex shells", "Keep", "Saved the trip"], ["Cotton t-shirt", "Ditch", "Took days to dry"], ["Extra socks (x3)", "Add", "Never enough"], ["Solar charger", "Ditch", "Cloud means no sun"]]}, {"type": "image", "src": "/images/gallery/trail-4.jpg", "alt": "Mist over a mountain trail", "caption": "Day one: this is the whole view."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Field notes, week 38', 'field-notes-week-38', 'Five small things from a week of building: a CSS snippet, a Postgres trick, a book, and a mistake worth keeping.', 'published', 'field-notes', 'bishnu', array['Field Notes','CSS','Postgres'], null, 'A laptop with a code editor on a desk', '2026-08-09'::date, 5, '[{"type": "p", "html": "Unpolished notes from the week. No narrative, just the things I would want to remember."}, {"type": "h2", "text": "A layout that does not jump", "id": "a-layout-that-does-not-jump"}, {"type": "p", "html": "Scrollbar appearance shifts every centred layout by a few pixels. <code>scrollbar-gutter: stable</code> fixes it in one line."}, {"type": "code", "lang": "css", "code": "html {\n  scrollbar-gutter: stable;\n}"}, {"type": "h2", "text": "Postgres: update and return", "id": "postgres-update-and-return"}, {"type": "p", "html": "You rarely need a round trip. <code>RETURNING</code> gives you the row you changed, which saves a read and a race."}, {"type": "code", "lang": "sql", "code": "UPDATE posts\nSET views = views + 1\nWHERE slug = $1\nRETURNING views;"}, {"type": "h2", "text": "A book", "id": "a-book"}, {"type": "p", "html": "Re-read <em>The Design of Everyday Things</em>. The idea I keep coming back to: an error message is a design failure, not a user failure."}, {"type": "h2", "text": "A mistake", "id": "a-mistake"}, {"type": "p", "html": "I put a <code>useEffect</code> on a value that was already derived from props. It caused a render loop in development and worked in production, which is the worst kind of bug. Derive, do not sync."}, {"type": "callout", "tone": "tip", "html": "If you are describing a value as <em>kept in sync</em> with something else, it probably should not be state."}, {"type": "h2", "text": "One more thing", "id": "one-more-thing"}, {"type": "p", "html": "A tiny rule that has improved my reviews: in every code review, name one thing the author did well before the first comment. It is not politeness theatre — it makes the rest of the review more honest."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('What a good postmortem looks like', 'what-a-good-postmortem-looks-like', 'A practical template, the parts people skip, and why the actions matter more than the apology. With a real example filled in.', 'published', 'security', 'bishnu', array['Incident Response','Culture'], null, 'An engineer reviewing data on a laptop', '2026-07-27'::date, 7, '[{"type": "p", "html": "Postmortems are often written as narrative. They should be written as instruments — something you can read at 3am next year and still learn from."}, {"type": "h2", "text": "The template", "id": "the-template"}, {"type": "list", "ordered": true, "items": ["<strong>Summary</strong> — three sentences, no jargon.", "<strong>Impact</strong> — who, how many, how long.", "<strong>Timeline</strong> — timestamps and what was observed.", "<strong>Root causes</strong> — plural, because there are almost always several.", "<strong>What went well</strong> — genuinely, not generously.", "<strong>Actions</strong> — named owners and dates."]}, {"type": "h2", "text": "The parts people skip", "id": "the-parts-people-skip"}, {"type": "table", "head": ["Section", "Usually", "What it should be"], "rows": [["Impact", "“Some users”", "12% of checkout attempts, 41 minutes"], ["What went well", "Empty", "We caught it in 2 min because of one alert"], ["Actions", "Vague ideas", "“Add jitter to SDK retries” — @rabin — 2026-08-02"]]}, {"type": "callout", "tone": "warning", "html": "An action without a name and a date is a wish. Treat it like a bug with no ticket."}, {"type": "h2", "text": "Blameless does not mean actionless", "id": "blameless-does-not-mean-actionless"}, {"type": "p", "html": "Blameless means we do not stop at “who pressed the button”. It does not mean we stop at “we will be more careful”. The actions are the product."}, {"type": "quote", "html": "The goal is not a confession. The goal is a system that fails in a better way next time."}, {"type": "h2", "text": "A filled-in example", "id": "a-filled-in-example"}, {"type": "p", "html": "For the incident in <a href=\"/blog/one-red-network-port\">One red network port</a>, the actions were: jitter in the SDK, the breaker plus its metric, link-quality alerts, and a named owner per action. Every one of them is still in place a year later."}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Small software, strong opinions', 'small-software-strong-opinions', 'An argument for fewer dependencies, narrower abstractions and software that does one thing so well a reader could rewrite it in an evening.', 'published', 'essays', 'bishnu', array['Craft','Software Design','Essay'], null, 'A close-up of a terminal with code', '2026-07-10'::date, 6, '[{"type": "p", "html": "I keep meeting codebases that can do anything and enjoy nothing. Every decision is deferred to configuration, every behaviour is a plugin, and nobody can say what the system is <em>for</em>."}, {"type": "h2", "text": "Opinions are compression", "id": "opinions-are-compression"}, {"type": "p", "html": "A strong opinion is a decision made once so it does not have to be made again. “We use Postgres for everything until it hurts” is not lazy. It is a bet that your needs fit a well-understood shape, which buys enormous clarity."}, {"type": "quote", "html": "Every configurable option is an argument that has not yet ended."}, {"type": "h2", "text": "The rewrite test", "id": "the-rewrite-test"}, {"type": "p", "html": "A good small system should be rewritable by one competent person in an evening. That sounds unserious. It is actually the highest bar — it means the surface is small enough to be understood."}, {"type": "list", "ordered": false, "items": ["Count the concepts, not the lines. Can you hold them in your head?", "If a new engineer cannot explain the data model after a day, the model is fighting them.", "Prefer deleting a feature to configuring it."]}, {"type": "h2", "text": "When this is wrong", "id": "when-this-is-wrong"}, {"type": "p", "html": "If you are a platform, the opinions belong to your users. But most of us are not platforms. We are a product, a blog, a bot — and the fastest path is usually one file more than you think you need."}, {"type": "p", "html": "Small software does not mean unambitious. It means the ambition goes into the thing, not the machinery around it."}]'::jsonb, false)
on conflict (slug) do nothing;

-- ---------- seed: legacy writeups (migrated from old app) ----------
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('testing', 'testing', 'An earlier note from the archive.', 'published', 'life', 'bishnu', array['xss','css','htl'], null, '', '2026-10-24'::date, 1, '[{"type": "p", "html": "hi how are you all test test"}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('New chapter?', 'new-chapter', 'A new chapter begins after a result I didn’t expect. Now it’s time to explore, learn, build, connect, and grow. Engineering will be one part of the journey, while I keep developing my skills and working toward something of my own. I don’t know where this path leads yet, but I’m ready to find out.', 'published', 'life', 'bishnu', array['personal','ioe','rank'], 'https://degrees.christianleaders.org/wp-content/uploads/2020/07/blog-posts-17-1030x579.jpg', '', '2026-08-05'::date, 5, '[{"type": "h2", "text": "Maybe This Is Where It Actually Starts. 🌱", "id": "maybe-this-is-where-it-actually-starts"}, {"type": "quote", "html": "A rank is just a number. This is just one moment of my life."}, {"type": "p", "html": "I recently received my IOE entrance result, and honestly, it hurt a little. I got around a <strong>3000 rank</strong>, which wasn’t what I had hoped for. I expected more from myself, and I know my parents did too. For a while, I felt disappointed and kept thinking about what I could have done differently. But after taking some time to reflect, I realized that one exam cannot define my ability, my potential, or my future. It only represents how I performed at one particular moment. <strong>One result does not decide the rest of my life.</strong>"}, {"type": "p", "html": "I’m planning to study engineering, possibly Electronics in Dharan, and I also have my CSIT entrance exam coming up, so I’ll give that a serious attempt. Maybe engineering will be the right path for me, maybe CSIT will take me somewhere different, or maybe I’ll discover something completely unexpected along the way. I’m starting to understand that I don’t need to have my entire future figured out right now. What matters is being willing to learn, explore, adapt, and make the most of whatever opportunity comes next. <strong>Maybe I don’t need the perfect path; maybe I just need to explore enough paths to find my own.</strong>"}, {"type": "p", "html": "I don’t want college to be the limit of my learning either. I want to explore programming, software development, cybersecurity, Web3, editing, communication, management, leadership, entrepreneurship, and whatever else genuinely interests me. I know I won’t master everything, and I don’t need to. I simply want to stay curious and keep experimenting. Sometimes I want everything at once—I want to learn, build, make money, meet people, start something of my own, and figure out my future as quickly as possible. But I’m learning that meaningful things take time. Skills take time to develop, projects take time to build, relationships take time to grow, and becoming the person I want to be will take even longer. So for now, I want to focus on the next exam, the next project, the next skill, and the next opportunity. <strong>One thing at a time.</strong>"}, {"type": "p", "html": "I’m also looking forward to the people I’ll meet along the way. I want to meet developers, engineers, entrepreneurs, creators, seniors, juniors, and people from completely different fields—not simply to build a network, but to build genuine relationships with people I can learn from, work with, exchange ideas with, and hopefully create something meaningful with someday. I believe the people around us shape the way we think, and I want to surround myself with people who are learning, building, experimenting, and trying to become better versions of themselves."}, {"type": "p", "html": "There’s also a dream I keep coming back to: <strong>I want to build my own company someday.</strong> I don’t know what it will be, when it will happen, or whether my first idea will succeed. Maybe it will work, maybe it won’t, but either way, I’ll learn. Before building a company, I want to become someone capable of turning ideas into reality—someone who can understand problems, learn what is necessary, build solutions, communicate, work with people, and keep going when things don’t work. <strong>Maybe the company comes later; the person capable of building it has to come first.</strong>"}, {"type": "p", "html": "More than anything, I want my parents to be proud of me. Maybe I haven’t met every expectation they had for me, and maybe this wasn’t the result they were hoping to see, but I want them to know that I’m trying. I want to become better not only academically, but technically, socially, creatively, professionally, and personally. I want to become someone who can learn, adapt, communicate, create, solve problems, and contribute something meaningful. I’m also learning to be patient with myself. I don’t need to learn everything, build everything, make money, start a company, and figure out my entire future right now. <strong>Learning takes time. Building takes time. Growing takes time.</strong>"}, {"type": "p", "html": "I don’t know where I’ll be a year from now, and maybe that’s okay. I might be studying something different, working on something I haven’t imagined yet, changing direction, failing at something, or discovering a completely new interest. What matters is that I keep moving forward. I didn’t get the result I wanted, and I’m still figuring things out, but I’m still here, still trying, and still willing to learn. <strong>A rank is just a number. An exam is just an exam. And this is just one moment of my life.</strong> Maybe years from now, I’ll look back and realize this wasn’t the moment I fell short. Maybe it was the moment I started building my own path."}, {"type": "p", "html": "For now, I don’t need a perfect plan. I just need to take the next step, learn from what comes, and keep moving."}, {"type": "quote", "html": "Maybe this is where it actually starts. 🌱"}, {"type": "p", "html": "<em>Not the perfect beginning. Not the perfect result. Just a beginning.</em>"}, {"type": "p", "html": "<strong>And maybe, that’s enough.</strong>"}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('An Ending, or Just a New Beginning?', 'an-ending-or-just-a-new-beginning', 'A reflection on the journey from a government school in Nawalparasi to studying in Kathmandu on a full scholarship, discovering technology, and reaching the final days of high school — realizing that what feels like an ending may actually be the beginning of a new path.', 'published', 'life', 'bishnu', array[]::text[], 'https://i.pinimg.com/originals/1d/90/a7/1d90a79861d29d072350c01901b2828f.jpg', '', '2026-03-10'::date, 10, '[{"type": "h2", "text": "Every Ending Has a Beginning.", "id": "every-ending-has-a-beginning"}, {"type": "p", "html": "Every ending has a beginning."}, {"type": "p", "html": "For me, that beginning started in Nawalparasi, where I completed my SEE from Jagannath Secondary School, Sunwal–12, Bhumahi. Life there was simple and familiar. I grew up around the same streets, the same classrooms, the same teachers, and the same people. I was comfortable with the environment I knew, and for a long time, I imagined that my future would continue in much the same way. My plan was simple: study science in my own school or somewhere nearby, perhaps in Butwal. I never seriously thought about leaving my hometown, moving to Kathmandu, or studying in a large private college. At that time, I thought I already had a general idea of what my future would look like. I didn’t know that life was quietly preparing me for something completely different."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/SDqkzpXj/3558acf5eb0e92663fb2cd2d34002ae4.jpg\" alt=\"Nawalparasi and school memories\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "Before coming to Kathmandu, my world felt small, but it was peaceful. My school, friends, teachers, family, and daily routine were all familiar. There was comfort in knowing where I belonged and what each day would look like. I didn’t feel the need to search for something different because I was happy with what I already had. Looking back, I realize that sometimes we only understand how important a chapter was after we have already moved beyond it. I didn’t know I was about to leave one part of my life behind and begin another."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/HLgCg57T/n3-e1690099266415.jpg\" alt=\"Kathmandu city and a new beginning\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "After completing my SEE exams, I came to Kathmandu to visit my maternal uncle. At first, it was simply a visit, but slowly, things changed. I started living with my cousin brother and began adjusting to a completely new environment. Kathmandu felt bigger, busier, faster, and unfamiliar compared to the life I had known in Nawalparasi. Everything seemed different—the roads, the people, the lifestyle, and even the way I spent my time. It took some adjustment, but that experience slowly taught me how to become more independent and comfortable outside the environment I had always known."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/7tspLrVC/Kathmandu-panoramio-2.jpg\" alt=\"Xavier Academy Lazimpat Kathmandu\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "Around the same time, my phone display broke. Instead of repairing it immediately, I decided to leave it that way because my entrance exams were getting closer. Without many of the distractions I was used to, my routine became surprisingly simple. Most of my days were spent studying, preparing for entrance exams, resting, and revising. It was not an exciting period, but it was an important one. I had fewer distractions, more time to think, and a clearer focus on what I needed to do next. At the time, I didn’t realize it, but that quiet period was helping me prepare for a much bigger change in my life."}, {"type": "p", "html": "When my SEE result was published, I received a GPA of 3.73. I was happy with my result, but I still believed that my future would follow the path I had originally imagined. Soon after, I appeared for the Metro scholarship entrance exam. At that time, it felt like just another exam. I didn’t know much about Xavier Academy, and I certainly didn’t expect that the result would change the direction of my education."}, {"type": "p", "html": "Then the scholarship result came out."}, {"type": "p", "html": "I found out that I had received a full scholarship at Xavier Academy, Lazimpat, Kathmandu."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/FLNrMJ0r/OIP.webp\" alt=\"College friends and memories\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "For me, it was a moment I didn’t expect. Coming from a government school background, getting the opportunity to study at a reputed college in Kathmandu felt like a major achievement. It was more than just receiving a scholarship. It felt like a door had suddenly opened to a world I had never seriously imagined myself entering. A plan that had always seemed distant suddenly became real, and I had to make a decision that would take me far outside the path I originally imagined."}, {"type": "p", "html": "My first days at Xavier Academy were a mixture of excitement and uncertainty. The campus was larger, the classrooms were different, and the environment felt completely new. The people around me had different backgrounds, experiences, and ways of thinking. For a while, I wondered whether I really belonged there. Everything was unfamiliar, and adjusting to a new environment was not always easy. But slowly, things started becoming comfortable."}, {"type": "p", "html": "I found a small group of friends who made those early days easier. We studied together, talked about random things, shared experiences, and slowly became part of each other’s everyday lives. Those friendships became an important part of my journey. What initially felt like an unfamiliar place gradually became somewhere I felt comfortable."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/m5NcjnbP/IMG-20240802-115656.jpg\" alt=\"High school memories and farewell\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "Over time, Xavier Academy became more than just a place where I attended classes. It became a place where I learned, struggled, improved, made mistakes, built friendships, discovered new interests, and became more confident. There were good days and difficult days, stressful exams and enjoyable moments, serious conversations and completely random ones. Most of those moments felt ordinary while they were happening, but now I realize that those ordinary moments are exactly what made these two years meaningful."}, {"type": "p", "html": "And now, somehow, those two years are coming to an end."}, {"type": "p", "html": "It feels strange to think that the classrooms I once entered every day will soon become memories. The people I used to see regularly may eventually take different paths. The routines that once felt repetitive may become things I miss. The conversations, laughter, exams, assignments, deadlines, celebrations, and even the stressful days will slowly become stories that I look back on."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/m5NcjnbP/IMG-20240802-115656.jpg\" alt=\"New beginning and future journey\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "At first, it feels like an ending. But the more I think about it, the more I realize that high school was never supposed to be the final destination. It was a foundation. These two years gave me more than academic knowledge. They gave me experiences, friendships, confidence, discipline, curiosity, and a better understanding of myself."}, {"type": "p", "html": "Most importantly, this journey taught me that life does not always follow the plan we create for it. I started with a simple idea of studying near home. Then I came to Kathmandu. I received an unexpected scholarship. I entered an environment I had never imagined myself being part of. I met people I would never have met if I had stayed on the path I originally planned."}, {"type": "p", "html": "None of it happened exactly the way I expected."}, {"type": "p", "html": "And maybe that is the point."}, {"type": "p", "html": "Sometimes the best parts of our journey are the things we never planned."}, {"type": "p", "html": "As high school comes to an end, I know there will be some uncertainty about what comes next. There will be new decisions, new challenges, new places, new people, and probably a few moments when I question whether I am making the right choices. But I’m no longer as afraid of that uncertainty as I used to be. I’ve learned that I don’t need to know the entire road before taking the next step."}, {"type": "p", "html": "&lt;img src=\"https://i.ibb.co/3ytXFH1v/622131822-712955255140415-6040296343035677927-n.jpg\" width=\"85%\" alt=\"Whole Class\" style=\"max-width:100%; height:auto;\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "I started this chapter as a student from Nawalparasi who thought his future would probably remain close to home. I’m ending it with a much bigger world in front of me and a much clearer understanding that there are countless possibilities ahead."}, {"type": "p", "html": "I don’t know exactly where the next chapter will take me."}, {"type": "p", "html": "Maybe I’ll succeed at things I’m working toward. Maybe I’ll fail at some of them. Maybe I’ll change my plans completely. Maybe I’ll discover interests and opportunities that I cannot even imagine today."}, {"type": "p", "html": "But I’m ready to find out."}, {"type": "p", "html": "High school may be ending, but learning, growth, friendships, ambition, and life itself are only beginning to take a different shape."}, {"type": "p", "html": "So I don’t want to call this goodbye. &lt;img src=\"https://i.ibb.co/S71ByNvQ/644243850-1688029442178926-5508502514591173956-n.jpg\" width=\"75%\" alt=\"Some Friends\" style=\"max-width:100%; height:auto;\" /&gt;"}, {"type": "divider"}, {"type": "p", "html": "I want to call it a thank you—for the people, the lessons, the opportunities, the struggles, the memories, and the version of myself that grew through all of it."}, {"type": "p", "html": "One chapter is ending."}, {"type": "p", "html": "But another one is waiting."}, {"type": "p", "html": "And maybe this is where the real journey begins. &lt;img src=\"https://i.ibb.co/9Ht2hp3B/648502902-2790151217989340-1811119373543532602-n.jpg\" width=\"75%\" alt=\"Group\" style=\"max-width:100%; height:auto;\" /&gt;"}]'::jsonb, false)
on conflict (slug) do nothing;
insert into public.fn_posts (title, slug, summary, status, topic_slug, author_id, tags, cover_url, cover_alt, date, reading_minutes, blocks, featured)
values ('Got my +2 results', 'got-my-2-results', 'A result I’m proud of, a journey I’m grateful for, and a new chapter I’m ready to explore. 3.78 is not the destination—it’s just another step forward.', 'published', 'life', 'bishnu', array['+2','neb','result'], 'https://tse3.mm.bing.net/th/id/OIP.gO4mjQXY8HLr28321tSIdwAAAA?r=0&rs=1&pid=ImgDetMain&o=7&rm=3', '', '2026-06-17'::date, 3, '[{"type": "p", "html": "Another Milestone."}, {"type": "p", "html": "After two years of hard work, I finally received my +2 result, and I got a GPA of 3.78. Honestly, I’m really happy with it. Seeing that number felt special because behind it were countless hours of studying, exams, assignments, pressure, doubts, late nights, and small efforts that nobody else could always see. It reminded me that progress doesn’t always happen in big moments; sometimes, it is built quietly, one day at a time. This result may be just a number on paper, but for me, it represents a chapter of effort that I can look back on with pride."}, {"type": "divider"}, {"type": "p", "html": "Getting 3.78 also made me pause and think about how much has changed since I first started +2. I came into this chapter with many questions about myself and my future, and now I’m leaving with more experience, more confidence, and a much clearer idea that there is still so much to discover. I’m grateful to my parents, teachers, friends, and everyone who supported me along the way. Their encouragement, expectations, advice, and presence became part of this journey, and I know I couldn’t have reached this point alone."}, {"type": "p", "html": "But I don’t want to see 3.78 as a finish line. I want to see it as a reminder that I’m capable of learning, improving, and pushing myself further. There is still so much I want to explore—technology, programming, cybersecurity, engineering, entrepreneurship, and many things I haven’t even discovered yet. I don’t know exactly which direction I’ll take, but I’m excited about finding out. Maybe the next chapter will be difficult. Maybe I’ll make mistakes. Maybe some plans will change. But I’m learning that not knowing everything is okay. Sometimes you discover your direction by simply having the courage to move forward."}, {"type": "divider"}, {"type": "p", "html": "This result gives me a moment to celebrate, but it also gives me a reason to dream bigger. The journey ahead will require more than good grades. It will require discipline, curiosity, patience, courage, and the willingness to keep going when things don’t work out. I want to become someone who doesn’t just collect results, but actually learns, builds, creates, takes opportunities, learns from failure, and becomes better through every experience."}, {"type": "p", "html": "For now, I’m simply grateful for this moment."}, {"type": "p", "html": "3.78 is a chapter I’m proud of."}, {"type": "p", "html": "But the story is far from over."}, {"type": "p", "html": "There are new exams ahead, new decisions to make, new people to meet, new skills to learn, and new paths waiting to be explored."}, {"type": "divider"}, {"type": "p", "html": "I don’t know exactly where this next chapter will take me."}, {"type": "p", "html": "And maybe I don’t need to."}, {"type": "p", "html": "I just need to keep learning, keep moving, and keep believing that there is something worth building ahead."}, {"type": "p", "html": "One chapter completed. Another one begins. And this time, the possibilities feel bigger than ever."}]'::jsonb, false)
on conflict (slug) do nothing;


-- ---------- seed: albums + photos ----------
with a as (
  insert into public.fn_albums (title, slug, subtitle, description, year, cover_url, sort_order)
  values ('Kathmandu in gold', 'kathmandu-in-gold', 'A city that wakes up slowly', 'Mandatory stops on the way home, photographed in the hour when the dust turns gold and nobody is rushing.', 2026, '/images/gallery/ktm-1.jpg', 10)
  on conflict (slug) do update set subtitle = excluded.subtitle, description = excluded.description, cover_url = excluded.cover_url, year = excluded.year
  returning id)
insert into public.fn_photos (album_id, src, alt, caption, width, height, taken_at, camera, position)
select (select id from a), '/images/gallery/ktm-1.jpg', 'Boudhanath at golden hour', 'Boudhanath at golden hour', 1400, 786, '2026-03-12'::date, 'Fujifilm X-T4 · 23mm', 0
union all
select (select id from a), '/images/gallery/ktm-2.jpg', 'The stupa below the Himalaya', 'The stupa below the Himalaya', 1400, 933, '2026-03-12'::date, 'Fujifilm X-T4 · 23mm', 1
union all
select (select id from a), '/images/gallery/ktm-3.jpg', 'Rooftops above the old town', 'Rooftops above the old town', 1400, 1050, '2026-03-13'::date, 'Fujifilm X-T4 · 23mm', 2
union all
select (select id from a), '/images/gallery/ktm-4.jpg', 'Prayer flags over the valley', 'Prayer flags over the valley', 1400, 933, '2026-03-13'::date, 'Fujifilm X-T4 · 23mm', 3
union all
select (select id from a), '/images/gallery/ktm-5.jpg', 'A narrow alley in the old town', 'A narrow alley in the old town', 1400, 2108, '2026-03-14'::date, 'Fujifilm X-T4 · 23mm', 4
union all
select (select id from a), '/images/gallery/ktm-6.jpg', 'Mountain light over the valley', 'Mountain light over the valley', 1400, 1786, '2026-03-14'::date, 'Fujifilm X-T4 · 23mm', 5;
with a as (
  insert into public.fn_albums (title, slug, subtitle, description, year, cover_url, sort_order)
  values ('The ridge', 'the-ridge', 'Three days of monsoon cloud', 'The ridge walk from <a href="/blog/walking-the-ridge-in-monsoon">Walking the ridge in monsoon</a>. Two views, one tea stop, and a lot of fog.', 2026, '/images/gallery/trail-1.jpg', 8)
  on conflict (slug) do update set subtitle = excluded.subtitle, description = excluded.description, cover_url = excluded.cover_url, year = excluded.year
  returning id)
insert into public.fn_photos (album_id, src, alt, caption, width, height, taken_at, camera, position)
select (select id from a), '/images/gallery/trail-1.jpg', 'The first ridge line above the cloud', 'The first ridge line above the cloud', 1400, 933, '2026-08-18'::date, 'Fujifilm X-T4 · 23mm', 0
union all
select (select id from a), '/images/gallery/trail-2.jpg', 'A sea of cloud at sunrise', 'A sea of cloud at sunrise', 1400, 933, '2026-08-19'::date, 'Fujifilm X-T4 · 23mm', 1
union all
select (select id from a), '/images/gallery/trail-3.jpg', 'A turn in the trail', 'A turn in the trail', 1400, 927, '2026-08-19'::date, 'Fujifilm X-T4 · 23mm', 2
union all
select (select id from a), '/images/gallery/trail-4.jpg', 'Mist over the forest', 'Mist over the forest', 1400, 933, '2026-08-19'::date, 'Fujifilm X-T4 · 23mm', 3
union all
select (select id from a), '/images/gallery/trail-5.jpg', 'Snow and night', 'Snow and night', 1400, 934, '2026-08-20'::date, 'Fujifilm X-T4 · 23mm', 4
union all
select (select id from a), '/images/gallery/trail-6.jpg', 'The valley at the end of the walk', 'The valley at the end of the walk', 1400, 933, '2026-08-20'::date, 'Fujifilm X-T4 · 23mm', 5;
with a as (
  insert into public.fn_albums (title, slug, subtitle, description, year, cover_url, sort_order)
  values ('City notes', 'city-notes', 'Concrete, light and other people', 'Frames from cities I pass through for work. Architecture, street level, and the strange quiet of a harbour at 7am.', 2025, '/images/gallery/street-1.jpg', 6)
  on conflict (slug) do update set subtitle = excluded.subtitle, description = excluded.description, cover_url = excluded.cover_url, year = excluded.year
  returning id)
insert into public.fn_photos (album_id, src, alt, caption, width, height, taken_at, camera, position)
select (select id from a), '/images/gallery/street-1.jpg', 'Rooftops from a window seat', 'Rooftops from a window seat', 1400, 861, '2025-11-04'::date, 'Fujifilm X-T4 · 23mm', 0
union all
select (select id from a), '/images/gallery/street-2.jpg', 'Street corner at dusk', 'Street corner at dusk', 1400, 933, '2025-11-05'::date, 'Fujifilm X-T4 · 23mm', 1
union all
select (select id from a), '/images/gallery/street-3.jpg', 'Glass and steel', 'Glass and steel', 1400, 933, '2025-11-05'::date, 'Fujifilm X-T4 · 23mm', 2
union all
select (select id from a), '/images/gallery/street-4.jpg', 'A quiet doorway', 'A quiet doorway', 1400, 934, '2025-11-06'::date, 'Fujifilm X-T4 · 23mm', 3
union all
select (select id from a), '/images/gallery/street-5.jpg', 'Looking up between buildings', 'Looking up between buildings', 1400, 2084, '2025-11-06'::date, 'Fujifilm X-T4 · 23mm', 4
union all
select (select id from a), '/images/gallery/street-6.jpg', 'The last light on the harbour', 'The last light on the harbour', 1400, 931, '2025-11-07'::date, 'Fujifilm X-T4 · 23mm', 5;
with a as (
  insert into public.fn_albums (title, slug, subtitle, description, year, cover_url, sort_order)
  values ('From the old gallery', 'old-gallery', 'Migrated frames', 'The photo collection carried over from the previous site.', 2026, '/images/gallery/legacy/00-1779625603143-ajx4agc.png', 2)
  on conflict (slug) do update set subtitle = excluded.subtitle, description = excluded.description, cover_url = excluded.cover_url, year = excluded.year
  returning id)
insert into public.fn_photos (album_id, src, alt, caption, width, height, taken_at, camera, position)
select (select id from a), '/images/gallery/legacy/00-1779625603143-ajx4agc.png', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 0
union all
select (select id from a), '/images/gallery/legacy/01-1779651926658-76nbkim.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 1
union all
select (select id from a), '/images/gallery/legacy/02-1779653975544-gxi9sai.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 2
union all
select (select id from a), '/images/gallery/legacy/03-1779654025268-b47n2uj.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 3
union all
select (select id from a), '/images/gallery/legacy/04-1779654060919-enrhs41.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 4
union all
select (select id from a), '/images/gallery/legacy/05-1779654072998-1uh8yfr.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 5
union all
select (select id from a), '/images/gallery/legacy/06-1779654082044-dt7w7dv.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 6
union all
select (select id from a), '/images/gallery/legacy/07-1779654090966-uiw30tf.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 7
union all
select (select id from a), '/images/gallery/legacy/08-1786100270130-r6b4rig.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 8
union all
select (select id from a), '/images/gallery/legacy/09-1786100289058-eytphmw.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 9
union all
select (select id from a), '/images/gallery/legacy/10-1786100303768-o4bmoz4.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 10
union all
select (select id from a), '/images/gallery/legacy/11-1786100329638-osy6ql5.jpg', 'Kathmandu — from the old newsroom gallery', '', 1400, 933, null::date, '', 11
union all
select (select id from a), '/images/gallery/legacy/12-1786100278653-yhixasz.jpg', 'Pic', 'Pic', 1400, 933, null::date, '', 12;

-- ---------- seed: subscribers (migrated from old app) ----------
insert into public.fn_subscribers (email, status, source) values ('gwbishnu10@gmail.com', 'subscribed', 'Legacy newsletter') on conflict (email) do nothing;
insert into public.fn_subscribers (email, status, source) values ('bishnuneup4ne@gmail.com', 'subscribed', 'Legacy newsletter') on conflict (email) do nothing;

-- ---------- seed: settings ----------
insert into public.fn_settings (id, payload) values (1, '{"identity": {"wordmark": "bishnuneup4ne", "siteName": "bishnuneup4ne — Security Newsroom", "tagline": "Security, systems and the life around them.", "email": "contact@bishnuneupane13.com.np", "location": "Kathmandu, Nepal"}, "hero": {"title": "Field notes from a life spent taking things apart.", "standfirst": "I break systems to make them safer, then write down what I learn."}, "socials": [{"label": "GitHub", "href": "https://github.com/bishnuneup4ne"}, {"label": "LinkedIn", "href": "https://www.linkedin.com/in/bishnuneup4ne/"}, {"label": "Threads", "href": "https://www.threads.com/@bishnuneup4ne"}, {"label": "Email", "href": "mailto:bishnuneup4ne@gmail.com"}], "toggles": {"newsletter": true, "comments": true, "views": true, "contactForm": true}, "nav": [{"label": "Blog", "href": "/blog"}, {"label": "Topics", "href": "/categories"}, {"label": "Gallery", "href": "/gallery"}, {"label": "About", "href": "/about"}], "footerLinks": [{"label": "RSS feed", "href": "/rss.xml"}, {"label": "Search", "href": "/search"}], "homeSections": [{"id": "latest", "enabled": true, "title": "The latest", "href": "/blog", "linkLabel": "All posts"}, {"id": "newsletter", "enabled": true, "title": "Newsletter"}]}'::jsonb) on conflict (id) do update set payload = excluded.payload || jsonb_build_object('seeded', coalesce(nullif(fn_settings.payload->>'seeded',''), '1')) where fn_settings.payload->>'seeded' is distinct from '1';
update public.fn_settings set payload = payload || '{"seeded":"1"}'::jsonb where id = 1;

-- ---------- cleanup: drop the old bundled default covers ----------
-- Covers should always be real uploads. This clears any post still pointing at
-- the bundled /images/cover-*.jpg placeholders from earlier seeds.
update public.fn_posts
set cover_url = null, cover_alt = ''
where cover_url like '/images/cover-%';
