import type { Post } from "@/lib/types";
import { author, guestAuthors } from "./authors";
import {
  area, code, column, divider, donut, flow, funnel, gauge, grouped, h2, h3, img, line, note, ol, p, pie,
  progress, quote, radar, readNext, scatter, stacked, table, timeline, tip, ul, warn,
} from "./builder";

export const posts: Post[] = [
  {
    slug: "observability-that-earns-its-keep",
    title: "Observability that earns its keep",
    description:
      "Most dashboards are decoration. Here is the small set of signals that actually helped me debug production, and how we cut our bill by 62% without losing them.",
    date: "2026-10-21",
    readingMinutes: 9,
    category: "engineering",
    tags: ["Observability", "OpenTelemetry", "Performance", "Postgres"],
    featured: true,
    author,
    blocks: [
      p("For two years our dashboards were a museum. Beautiful, expensive, and only ever opened after an incident. When we finally audited them we found 412 metrics, of which <strong>nine</strong> had been looked at in the last quarter."),
      p("This is the story of deleting most of it, keeping the nine, and learning what observability is actually for."),
      note("This is a demo post. Every number below is illustrative, but the workflow is exactly the one I use on real systems."),
      { type: "jumplinks", title: "Jump to a section" },
      h2("Start from questions, not metrics"),
      p("The mistake is starting with what the tool can collect. Start instead with the questions you want to answer at 3am:"),
      ol(
        "Is the system up, and is it <em>half</em> up?",
        "Which dependency is slow, and is it slow for everyone or just one tenant?",
        "Did this change since the last deploy?",
        "Is the user <em>experience</em> degraded even though every individual service looks healthy?",
      ),
      p("Everything that does not serve one of those questions gets a one-way trip to the archive. If we need it later, we can add it back with a story attached."),
      h2("The nine signals we kept"),
      table(
        ["Signal", "Type", "Answers"],
        ["Edge request p95 / p99", "Histogram", "Is it slow for users?"],
        ["Error rate by route", "Counter", "Is it broken, and where?"],
        ["Saturation (CPU, conn pool, queue depth)", "Gauge", "Are we about to fall over?"],
        ["Queue lag seconds", "Gauge", "Is work backing up?"],
        ["DB query p95 by operation", "Histogram", "Is the database the culprit?"],
        ["Cache hit ratio", "Gauge", "Are we paying for the same query twice?"],
        ["Deploy marker", "Event", "What changed?"],
        ["Feature flag state", "Event", "Who saw the change?"],
        ["Business funnel completion", "Counter", "Is anyone finishing the thing?"],
      ),
      tip("Attach the deploy marker and feature-flag state to every chart. Half of debugging is aligning a red line with a change."),
      h2("Instrumentation you can read"),
      p("I keep a single, boring wrapper around the OpenTelemetry tracer so every span gets the same attributes. If you have to remember how to instrument something, you will skip it."),
      code(
        "typescript",
        `
import { trace, SpanStatusCode } from "@opentelemetry/api";

const tracer = trace.getTracer("api");

export async function withSpan<T>(
  name: string,
  attrs: Record<string, string | number>,
  fn: () => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, { attributes: attrs }, async (span) => {
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.recordException(err as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      span.end();
    }
  });
}
`,
        "src/lib/tracing.ts",
      ),
      p("Call sites stay obvious at review time:"),
      code(
        "typescript",
        `
const invoices = await withSpan(
  "invoices.list",
  { "tenant.id": tenantId, "user.id": userId },
  () => db.invoice.findMany({ where: { tenantId } }),
);
`,
      ),
      h2("Cardinality is the bill"),
      p("The reason our bill exploded was unbounded attributes. A <code>user.id</code> on every span is a new time series per user. The fix is not to stop attributing — it is to bucket."),
      code(
        "typescript",
        `
// Before: one time series per user id
span.setAttribute("user.id", userId);

// After: buckets you can reason about
span.setAttribute("user.tier", user.tier);          // free | pro | team
span.setAttribute("user.signup_cohort", cohortOf(user)); // 2026-Q1, ...
span.setAttribute("user.id_bucket", hashToBucket(userId, 32));
`,
      ),
      warn("Never put raw identifiers, emails, or request bodies on spans. Trace backends are queryable by everyone on the team, and PII spreads."),
      img("/images/gallery/trail-2.jpg", "Cloud filling a mountain valley at sunrise", "A quiet morning is the best trace viewer. Every span above came from one of these."),
      h2("The 62% cleanup"),
      ul(
        "Dropped 403 low-value metrics (92% of the bill, 0% of the value).",
        "Sampled traces at 10% success / 100% error, with a sticky key so a user's traces are complete.",
        "Moved long-term retention from 90 days to 14 days, keeping rollups forever.",
        "Added one shared dashboard per service, owned by a named person.",
      ),
      quote("If nobody knows who owns a dashboard, nobody will fix it. Ownership is part of the signal.", undefined),
      flow("The audit we ran", [
        "Pick the five questions that matter at 3am",
        "Trace every dashboard panel back to a question",
        "Archive panels nobody opened in 90 days",
        "Keep nine signals, write down why",
      ], { layout: "grid", style: "chip", connector: "number" }),
      column("Requests per region", [["APAC", 820], ["EMEA", 640], ["AMER", 410]], { unit: "k" }),
      grouped(
        "p95 latency by tier (before vs after)",
        ["Search", "Checkout", "Profile"],
        [["Before", [420, 610, 380]], ["After", [180, 240, 150]]],
        { unit: "ms" },
      ),
      stacked("Errors by cause", ["Jan", "Feb", "Mar"], [["Timeouts", [12, 8, 4]], ["Bad deploys", [7, 3, 1]], ["Upstream", [4, 6, 2]]]),
      area("Traffic, sampled vs full", [["W1", 120], ["W2", 180], ["W3", 240], ["W4", 210]]),
      donut("Storage by tier", [["Hot", 18], ["Warm", 46], ["Cold", 36]], { unit: "%" }),
      scatter(
        "Latency vs payload size",
        [[12, 90], [24, 140], [36, 210], [48, 260], [60, 355], [72, 340]],
        { xLabel: "Payload (KB)", yLabel: "Latency (ms)" },
      ),
      radar("Service health", ["Speed", "Cost", "Safety", "Reach", "Uptime"], [["Now", [8, 6, 9, 7, 9]], ["Target", [9, 8, 9, 9, 10]]]),
      gauge("Error budget used", 62, 100, { unit: "%", label: "SLO: 99.9% over 30 days" }),
      funnel("Signup funnel", [["Visited", 10000], ["Signed up", 4200], ["Verified", 3100], ["Active", 1800]]),
      progress("Quarter goals", [["Migration", 82], ["Docs", 64], ["On-call", 95]], { unit: "%" }),
      timeline("Incident timeline", [["09:12", "Alert fires"], ["09:20", "Owner engaged"], ["10:05", "Mitigation applied"], ["11:30", "All clear"]]),
      pie("Where the 412 metrics went", [["Archived", 283], ["Rewritten", 120], ["Kept", 9]]),
      line(
        "Incidents resolved under 30 minutes",
        [["Jan", 6], ["Feb", 9], ["Mar", 14], ["Apr", 18], ["May", 21], ["Jun", 24]],
        { caption: "Fewer metrics meant faster questions at 3am." },
      ),
      h2("What I would do differently"),
      readNext(
        { slug: "what-a-good-postmortem-looks-like", title: "What a good postmortem looks like" },
        "The template I wish I had opened the morning after — and why the actions matter more than the apology.",
        "/images/gallery/trail-2.jpg",
      ),
      p("I would have started with the incident review template. Every time an alert is sent, the on-call should be able to say <em>which chart</em> they opened first. That list is your real observability spec — everything else is ceremony."),
      divider(),
      p("If you are running a small team, spend the budget on sampling and ownership before you spend it on more vendors. The tooling is rarely the bottleneck."),
    ],
  },
  {
    slug: "one-red-network-port",
    title: "One red network port, six hours, three lessons",
    description:
      "A quiet incident that looked like a DDoS, felt like a database outage, and ended up being a single misconfigured link. A walk through the timeline and the fixes.",
    date: "2026-10-14",
    readingMinutes: 8,
    category: "security",
    tags: ["Incident Response", "Networking", "SRE"],
    author,
    blocks: [
      p("At 02:14 the alert fired: error rate above 5% for the checkout route. By 02:20 the graph looked like a DDoS. By 03:00 it looked like a database outage. It was neither."),
      note("Names and numbers are fictionalised for this demo post. The shape of the incident is real and common."),
      h2("Timeline"),
      table(
        ["Time", "Event", "Owner"],
        ["02:14", "Error rate alert, 5.2%", "On-call"],
        ["02:19", "DB connection pool saturated", "On-call"],
        ["02:41", "Failover to read replica, no change", "On-call + DBA"],
        ["03:10", "Traffic looks doubled from one /16", "Security"],
        ["04:05", "Discovered retry storm, capped it", "Platform"],
        ["05:48", "Root cause: one link at 100% loss", "Network"],
        ["06:22", "Fix deployed, error rate 0.1%", "All"],
      ),
      h2("Lesson one: retries are an amplifier"),
      p("A healthy retry policy sent three attempts per failed request with no jitter. One flaky link became a flood of work. Exponential backoff with jitter turned a wall of traffic into a polite knock."),
      code(
        "typescript",
        `
export async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      const backoff = Math.min(2 ** i * 200, 4_000);
      const jitter = Math.random() * backoff * 0.5;
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
  throw new Error("unreachable");
}
`,
      ),
      h2("Lesson two: a circuit breaker is a courtesy"),
      p("When a dependency is failing, the kindest thing you can do is stop asking for a moment. We added a simple breaker in front of the flaky dependency."),
      code(
        "typescript",
        `
export class Breaker {
  private failures = 0;
  private openUntil = 0;

  constructor(private readonly threshold = 5, private readonly cooloffMs = 10_000) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (Date.now() < this.openUntil) throw new Error("circuit open");
    try {
      const out = await fn();
      this.failures = 0;
      return out;
    } catch (err) {
      if (++this.failures >= this.threshold) {
        this.openUntil = Date.now() + this.cooldown;
      }
      throw err;
    }
  }
}
`,
      ),
      warn("A breaker without a metric is a mystery. Emit state transitions as events so they show up next to the error rate."),
      h2("Lesson three: name the network"),
      p("The cleanest fix came from looking at switch counters. One uplink was flapping, and it happened to carry the path to the primary database's replica. The alert we had was on the symptom; we needed a health check on the link."),
      ul(
        "Track CRC and drop counters on every uplink.",
        "Alert when a link is lossy for more than 30 seconds, not just when it is fully down.",
        "Label traces with the zone or rack so a bad path is visible as a cluster, not uniform noise.",
      ),
      quote("The monitor you wish you had at 3am is the one to build on Monday.", undefined),
      h2("The follow-up list"),
      ol(
        "Add jitter to every retry in the client SDK.",
        "Ship the breaker and its state metric.",
        "Add link-quality alerts.",
        "Write the postmortem within a week, with a named owner per action.",
      ),
      p("Six hours is a long incident for something this small. Most of it was spent confirming what it wasn't. The fixes are boring, and that is the point."),
    ],
  },
  {
    slug: "reading-the-himalaya-in-black-and-white",
    title: "Reading the Himalaya in black and white",
    description:
      "Why I stripped colour out of a year of mountain frames, and what it taught me about contrast, patience and being on the trail before sunrise.",
    date: "2026-10-03",
    readingMinutes: 6,
    category: "photography",
    tags: ["Photography", "Himalaya", "Story"],
    author,
    blocks: [
      p("Colour is generous. It forgives a flat sky and a busy frame. Black and white does not. This year I walked a section of the Ganesh Himal with one rule: convert every frame to monochrome before deciding whether it worked."),
      h2("Three frames"),
      img("/images/gallery/trail-1.jpg", "A ridge line above the clouds", "06:12 — the first light that made it above the haze."),
      img("/images/gallery/trail-3.jpg", "A turn in a mountain trail", "A turn that hid the valley for ten minutes."),
      img("/images/gallery/trail-5.jpg", "Snow-covered peaks under a dark sky", "Night arriving with the last of the snow."),
      h2("What I learned"),
      ul(
        "Contrast at the edge of the frame decides whether the eye enters. I cropped more generously in colour and learned to leave a little air.",
        "Texture is the detail that replaces colour. A trailline, grass, a stone wall — anything that says <em>ground</em>.",
        "Patience is the actual technique. Every frame here was a second attempt after the light moved.",
      ),
      quote("In colour you photograph a place. In monochrome you photograph the shape of a place.", "A note to myself, somewhere above 3,800m"),
      p("The rest of the set lives in the gallery. I have left the colour originals in the album too, because sometimes you want to remember the sky."),
    ],
  },
  {
    slug: "notes-on-typography-for-developers",
    title: "Notes on typography for developers",
    description:
      "Small, specific decisions that make a reading page feel considered: measure, rhythm, alignment and the cheap wins that cost ten minutes.",
    date: "2026-09-24",
    readingMinutes: 7,
    category: "engineering",
    tags: ["Design", "Typography", "Frontend"],
    author,
    blocks: [
      p("I am not a designer, but I can tell when a page is uncomfortable. Here are the handful of typographic decisions I apply to every reading page, with the before and after."),
      h2("The measure"),
      p("A line of body text wants to be between 60 and 75 characters. On a 16px system font that is roughly 600–700px, not the full 1200px container."),
      code(
        "css",
        `
.reading {
  max-width: 68ch;      /* the readable column */
  margin-inline: auto;
  padding-inline: 24px;
}

.breaks-out {
  width: min(1000px, 100%);
  margin-inline: calc(50% - min(500px, 50%));
}
`,
        "post.css",
      ),
      h2("Rhythm"),
      p("Pick one unit and use it for every vertical gap. I use 8px. Headings get two units above and one below. Paragraphs get one unit. That is the entire system."),
      table(
        ["Element", "Gap above", "Gap below"],
        ["h2", "48px", "16px"],
        ["h3", "32px", "8px"],
        ["p", "16px", "16px"],
        ["code block", "24px", "24px"],
      ),
      tip("If spacing feels wrong and you cannot say why, you probably have three different systems. Collapse to one."),
      h2("Contrast without darkness"),
      p("In dark themes, never use pure white on pure black for body copy. It is harsh. Start around #ededed on #000 and let headings be the brightest thing on the page."),
      code(
        "css",
        `
:root {
  --bg: #000;
  --text: #ededed;      /* body */
  --text-secondary: #a1a1a1;
  --text-muted: #6b6b6b;
}
`,
      ),
      h2("The cheap wins"),
      readNext(
        { slug: "notes-on-typography-for-developers", title: "Notes on typography for developers" },
        "The measure, rhythm and alignment decisions behind a page that reads like a page.",
      ),
      ul(
        "Tabular numbers for dates and counts so things line up.",
        "Hanging punctuation on quotes — one line of CSS, looks expensive.",
        "<code>text-wrap: balance</code> on headings to stop orphans.",
        "<code>font-variant-numeric</code> for tables and stats.",
      ),
      p("None of this is original. All of it is cheap. Most of what makes a page feel premium is just refusing to let three small things go unconsidered."),
    ],
  },
  {
    slug: "deploying-without-fear",
    title: "Deploying without fear",
    description:
      "How a small team moved from Friday-night deploy ceremonies to shipping several times a day, and the three guardrails that made it safe.",
    date: "2026-09-12",
    readingMinutes: 8,
    category: "engineering",
    tags: ["Deploy", "CI/CD", "Postgres"],
    author: guestAuthors.anika,
    blocks: [
      p("Two years ago our deploys were an event. Someone would send a message, everyone would hold their breath, and if it went wrong we would revert and try again on Monday. Now we ship several times a day and nobody notices."),
      note("Written by a guest contributor for this demo. The practices are drawn from real teams I have worked with."),
      h2("Guardrail one: the deploy is not the risky part"),
      p("The risky part is the migration. Separate schema changes from code changes. First add, then write, then read, then delete — in that order, across deploys."),
      code(
        "sql",
        `
-- deploy 1: add the column, nullable, no default
ALTER TABLE orders ADD COLUMN currency text;

-- deploy 2: backfill in batches
UPDATE orders SET currency = 'NPR'
WHERE id IN (SELECT id FROM orders WHERE currency IS NULL LIMIT 1000);

-- deploy 3: enforce
ALTER TABLE orders ALTER COLUMN currency SET NOT NULL;
`,
        "migrations/0042_currency.sql",
      ),
      warn("A migration that locks a large table will look like an outage. Get the lock timeout from the plan, not from hope."),
      h2("Guardrail two: every deploy is a labelled event"),
      readNext(
        { slug: "observability-that-earns-its-keep", title: "Observability that earns its keep" },
        "Which signals actually earn their keep when you are paged at 3am.",
        "/images/gallery/trail-3.jpg",
      ),
      p("The simplest high-leverage thing we did was make deploys visible on every chart. A red line, a deploy marker, and a name. Suddenly people could answer <em>what changed</em> without asking in chat."),
      code(
        "bash",
        `
gh workflow run deploy.yml \\
  --field version="$(git rev-parse --short HEAD)" \\
  --field annotate=true
`,
      ),
      h2("Guardrail three: a one-command rollback"),
      p("If rolling back is hard, people wait and hope instead. We made rollback the same button as deploy, and we practice it once a quarter."),
      ol(
        "Rollback the code to the previous image.",
        "Leave the additive migration in place.",
        "Post the incident note with the deploy marker.",
      ),
      quote("Deploy speed is not a virtue. Reversibility is.", undefined),
      p("The result is not that we break things less. It is that breaking things is small, fast and boring. That is the whole goal."),
    ],
  },
  {
    slug: "the-quiet-morning",
    title: "The quiet morning",
    description:
      "On getting up before the city does, the first hour without a phone, and why the best engineering decision I make all day happens at 6:40am.",
    date: "2026-09-01",
    readingMinutes: 4,
    category: "life",
    tags: ["Habits", "Focus", "Story"],
    author,
    blocks: [
      p("I do not usually write about routines. But the quiet morning has changed how I work more than any tool I have adopted in the last five years."),
      h2("The shape of the hour"),
      p("Tea. Notebook. No phone until I have written something down — even if it is a question I cannot answer yet. By the time the neighbourhood wakes up, the hardest decision of the day is usually already made."),
      ul(
        "6:00 — wake, no screen",
        "6:10 — tea, open notebook",
        "6:20 — write the <em>one question</em> for today",
        "6:50 — first run of the day, before reading anything",
      ),
      quote("The first hour is not about productivity. It is about having a place to stand before the day starts pushing.", undefined),
      h2("What it changed"),
      readNext(
        { slug: "walking-the-ridge-in-monsoon", title: "Walking the ridge in monsoon" },
        "The same walk in three weathers, and what the light does to the ridge line.",
        "/images/gallery/trail-1.jpg",
      ),
      p("I stopped starting the day inside someone else's priority. The inbox is still there at 7:30. It just no longer gets to define the shape of the work."),
      img("/images/gallery/ktm-2.jpg", "The city in early morning light", "Kathmandu just after sunrise — the only hour it feels slow."),
    ],
  },
  {
    slug: "walking-the-ridge-in-monsoon",
    title: "Walking the ridge in monsoon",
    description:
      "Leaches, fog, and a view that never arrived. A short trail report from three days on the ridge, plus what I would pack differently.",
    date: "2026-08-18",
    readingMinutes: 5,
    category: "life",
    tags: ["Trail", "Nepal", "Story"],
    author,
    blocks: [
      p("Monsoon trekking is not brave. It is just wet. Three days on the ridge, two views, one very good tea stop."),
      h2("Day-by-day"),
      h3("Day one — up into the cloud"),
      p("The trail starts in jungle. Within an hour the cloud closes in and stays there. Every leaf is holding water. I stopped counting leaches after the first two."),
      h3("Day two — the ridge"),
      p("The only gap in the clouds opened for eleven minutes. That is the view above, and it was worth the whole walk."),
      h3("Day three — down"),
      p("Knees, rain, and a bus that was late by a country mile. Still better than a weekend indoors."),
      h2("What I would pack differently"),
      table(
        ["Item", "Verdict", "Why"],
        ["Gore-Tex shells", "Keep", "Saved the trip"],
        ["Cotton t-shirt", "Ditch", "Took days to dry"],
        ["Extra socks (x3)", "Add", "Never enough"],
        ["Solar charger", "Ditch", "Cloud means no sun"],
      ),
      img("/images/gallery/trail-4.jpg", "Mist over a mountain trail", "Day one: this is the whole view."),
    ],
  },
  {
    slug: "field-notes-week-38",
    title: "Field notes, week 38",
    description:
      "Five small things from a week of building: a CSS snippet, a Postgres trick, a book, and a mistake worth keeping.",
    date: "2026-08-09",
    readingMinutes: 5,
    category: "field-notes",
    tags: ["Field Notes", "CSS", "Postgres"],
    author,
    blocks: [
      p("Unpolished notes from the week. No narrative, just the things I would want to remember."),
      h2("A layout that does not jump"),
      p("Scrollbar appearance shifts every centred layout by a few pixels. <code>scrollbar-gutter: stable</code> fixes it in one line."),
      code("css", `
html {
  scrollbar-gutter: stable;
}
`),
      h2("Postgres: update and return"),
      p("You rarely need a round trip. <code>RETURNING</code> gives you the row you changed, which saves a read and a race."),
      code("sql", `
UPDATE posts
SET views = views + 1
WHERE slug = $1
RETURNING views;
`),
      h2("A book"),
      p("Re-read <em>The Design of Everyday Things</em>. The idea I keep coming back to: an error message is a design failure, not a user failure."),
      h2("A mistake"),
      p("I put a <code>useEffect</code> on a value that was already derived from props. It caused a render loop in development and worked in production, which is the worst kind of bug. Derive, do not sync."),
      tip("If you are describing a value as <em>kept in sync</em> with something else, it probably should not be state."),
      h2("One more thing"),
      p("A tiny rule that has improved my reviews: in every code review, name one thing the author did well before the first comment. It is not politeness theatre — it makes the rest of the review more honest."),
    ],
  },
  {
    slug: "what-a-good-postmortem-looks-like",
    title: "What a good postmortem looks like",
    description:
      "A practical template, the parts people skip, and why the actions matter more than the apology. With a real example filled in.",
    date: "2026-07-27",
    readingMinutes: 7,
    category: "security",
    tags: ["Incident Response", "Culture"],
    author,
    blocks: [
      p("Postmortems are often written as narrative. They should be written as instruments — something you can read at 3am next year and still learn from."),
      h2("The template"),
      ol(
        "<strong>Summary</strong> — three sentences, no jargon.",
        "<strong>Impact</strong> — who, how many, how long.",
        "<strong>Timeline</strong> — timestamps and what was observed.",
        "<strong>Root causes</strong> — plural, because there are almost always several.",
        "<strong>What went well</strong> — genuinely, not generously.",
        "<strong>Actions</strong> — named owners and dates.",
      ),
      h2("The parts people skip"),
      table(
        ["Section", "Usually", "What it should be"],
        ["Impact", "\u201cSome users\u201d", "12% of checkout attempts, 41 minutes"],
        ["What went well", "Empty", "We caught it in 2 min because of one alert"],
        ["Actions", "Vague ideas", "\u201cAdd jitter to SDK retries\u201d — @rabin — 2026-08-02"],
      ),
      warn("An action without a name and a date is a wish. Treat it like a bug with no ticket."),
      h2("Blameless does not mean actionless"),
      p("Blameless means we do not stop at \u201cwho pressed the button\u201d. It does not mean we stop at \u201cwe will be more careful\u201d. The actions are the product."),
      quote("The goal is not a confession. The goal is a system that fails in a better way next time.", undefined),
      h2("A filled-in example"),
      p("For the incident in <a href=\"/blog/one-red-network-port\">One red network port</a>, the actions were: jitter in the SDK, the breaker plus its metric, link-quality alerts, and a named owner per action. Every one of them is still in place a year later."),
    ],
  },
  {
    slug: "small-software-strong-opinions",
    title: "Small software, strong opinions",
    description:
      "An argument for fewer dependencies, narrower abstractions and software that does one thing so well a reader could rewrite it in an evening.",
    date: "2026-07-10",
    readingMinutes: 6,
    category: "essays",
    tags: ["Craft", "Software Design", "Essay"],
    author,
    blocks: [
      p("I keep meeting codebases that can do anything and enjoy nothing. Every decision is deferred to configuration, every behaviour is a plugin, and nobody can say what the system is <em>for</em>."),
      h2("Opinions are compression"),
      p("A strong opinion is a decision made once so it does not have to be made again. \u201cWe use Postgres for everything until it hurts\u201d is not lazy. It is a bet that your needs fit a well-understood shape, which buys enormous clarity."),
      quote("Every configurable option is an argument that has not yet ended.", undefined),
      h2("The rewrite test"),
      p("A good small system should be rewritable by one competent person in an evening. That sounds unserious. It is actually the highest bar — it means the surface is small enough to be understood."),
      ul(
        "Count the concepts, not the lines. Can you hold them in your head?",
        "If a new engineer cannot explain the data model after a day, the model is fighting them.",
        "Prefer deleting a feature to configuring it.",
      ),
      h2("When this is wrong"),
      p("If you are a platform, the opinions belong to your users. But most of us are not platforms. We are a product, a blog, a bot — and the fastest path is usually one file more than you think you need."),
      p("Small software does not mean unambitious. It means the ambition goes into the thing, not the machinery around it."),
    ],
  },
];
