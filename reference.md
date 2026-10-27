# blog.google reference — components, UI patterns, and what this repo has

Built from `curl` + `view-source` of these pages (fetched 2026-10-27):

| Page | URL | Role |
|---|---|---|
| Home | https://blog.google/ | Landing / index |
| Chrome study tips | https://blog.google/products-and-platforms/products/chrome/tips-for-school-and-studying/ | Article (tips list, inline video) |
| Flow creative controls | https://blog.google/innovation-and-ai/models-and-research/google-labs/new-creative-controls-google-flow/ | Short article |
| AI Quests Polar Peaks | https://blog.google/products-and-platforms/products/education/ai-quests-polar-peaks/ | Article with inline related card |
| AI products listing | https://blog.google/innovation-and-ai/products/ | Collection / feed page |
| Gemini 4 Argon | https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon/ | Long article, media carousels |

blog.google is server-rendered with **custom elements** (`uni-*`). Each section is a
`<section class="uni-page uni-grid uni-article-paragraph">` on a 12-column grid.
Layout classes are named `uni-grid__col--span-N`, `--start-N`, `--span-N-tablet`,
`--span-N-desktop`.

---

## 1. Design tokens (measured from the live DOM)

| Token | Value | Used by |
|---|---|---|
| Related-card gradient | `linear-gradient(227deg, #f0f3ff 16.73%, #d0d9ff 98.44%)` | Related Article tout |
| Card radius | `24px` | Tout, article cards, media tiles |
| Body text | `18px / 26px`, weight 300, "Google Sans" | Article paragraphs |
| Heading h4 | `28px / 36px`, weight 400, "Google Sans Flex" | Tout title |
| Eyebrow | `14px / 28px`, weight 500, `letter-spacing .2px` | Tout eyebrow, card eyebrow |
| Caption | `14px / 24px` | Tout summary, figcaptions |
| Page max width | `1280–1440px`, 12 columns, 12px gutters | All pages |

---

## 2. Related Article card (the light-lavender card)

**Source:** `uni-related-content-tout`

```html
<uni-related-content-tout
  eyebrow="Related Article"
  title="5 amazing visuals of the fruit fly brain"
  summary="Here's how these images are advancing neuroscience."
  cta="See more"
  fullUrl="https://blog.google/…/male-fruit-fly-brain-map/"
  imageUrl="…/Male_Fruit_Fly_social.width-800.format-webp.webp"
  data-theme-color="purple">
  <div class="uni-related-content-tout__container" role="group" aria-labelledby="tout-title">
    <div class="uni-related-content-tout__content">
      <p class="uni-related-content-tout__eyebrow font-eyebrow">Related Article</p>
      <h2 id="tout-title" class="uni-related-content-tout__title font-h4">…</h2>
      <div class="uni-related-content-tout__summary font-body-s">…</div>
      <div class="uni-related-content-tout__cta-container">
        <uni-cta emphasis="low" icon-id-right="arrow-forward" href="…">See more</uni-cta>
      </div>
    </div>
    <div class="uni-related-content-tout__image-container">
      <img class="uni-related-content-tout__image" srcset="…800w, …1600w, …2200w" sizes="(max-width: 1023px) 100vw, 50vw" alt="">
    </div>
  </div>
</uni-related-content-tout>
```

**UI anatomy**

```
┌──────────────────────────── 846×259, radius 24, padding 24 ─────────────────────────┐
│ ┌──────────── 375px ─────────────┐  gap 24  ┌──────────── 375px ─────────────┐      │
│ │ Related Article   14/28 w500   │          │  ┌──────────────────────────┐  │      │
│ │ Title 28/36 w400         ↘     │          │  │  image, radius 24        │  │      │
│ │ Summary 14/24                  │          │  │  object-fit: cover       │  │      │
│ │ See more →        w300/500     │          │  └──────────────────────────┘  │      │
│ └────────────────────────────────┘          └────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

- Background: lavender gradient (not flat), text stays dark `#202124`.
- 50/50 flex split; whole card is one link.
- Image is a rounded rectangle inset by the card padding (not edge-to-edge).
- CTA is plain text + arrow, not a filled button.
- `aria-labelledby` ties the group to its title; image is `alt=""` (decorative,
  the title already conveys meaning).
- Responsive: stacks full-width on mobile (image on top in this repo's version).

**In this repo:** `src/components/blog/PostContent.tsx` → block `type: "related"`,
styles `.relatedTout*` in `PostContent.module.scss`. Fields: `slug`, `title`,
`description`, `image`, `eyebrow` (default "Related Article"), `cta` (default
"See more"). Add it in the editor via **Read next** block → pick a post.

---

## 3. Article shell

Common to all article pages:

| Component | Markup | UI |
|---|---|---|
| Breadcrumbs | `uni-breadcrumbs` | `Home › Products › Chrome` 14px grey |
| Title | `h1` | ~44–56px display, weight 400 |
| Meta line | `uni-reading-time` | `Oct 26, 2026 · 3 min read` |
| Standfirst | `p.font-body-l` | 20–22px grey under the title |
| Byline | `uni-single-author-byline` | Avatar-less name + role, Share button right |
| Hero | `uni-inline-image alignment="full"` | Full-width rounded (24px) image or autoplay mp4 |
| Page gradient | `.uni-page` background | Soft mint→blue vertical wash at the top |
| Body | `uni-article-paragraph` | `.rich-text` inside `uni-grid__col--layout-6` (6 of 12 cols) |
| Reading progress | fixed bar | Thin blue fill + post title once the header hides |

**In this repo:** `src/app/(site)/blog/[slug]/` (`page.tsx`, `post.module.scss`),
`ArticleProgress`, `PostMetaBar`, `InTheArticle`.

---

## 4. Inline media: image with optional video

```html
<uni-inline-image alignment="full"
  alt-text="Gemini in Chrome desktop uses…"
  or-mp4-video-url="https://…/Gameplay.mp4"
  autoplay="true" />
```

- Renders an image that becomes/replaces with an mp4 on autoplay (muted, loop).
- `alignment` = `full` on every instance checked; other values would be
  `left`/`right` for floated figures.
- Chrome tips uses **5 of these**, 4 with an mp4 — this is the main "how-to"
  visual pattern for tip lists.

**In this repo:** `image` block + `video` block (`VideoEmbed`), and the media
rail (`MediaCarousel`) for rows. The `video` block now supports `poster` and
`autoplay` (muted + loop + controls) for direct mp4/webm uploads, which covers
this inline-media pattern. Editor: **Video** block → upload file, paste a
poster URL, tick **Autoplay muted + loop**.

---

## 5. Media carousel (Argon post)

```html
<uni-media-carousel>
  <uni-media-carousel-viewport>
    <uni-media-carousel-slide data-theme="blue" data-index="0" accordion-header="…long caption…">
      <div slot="content">
        <uni-youtube-player-media-carousel video-id="WwDApkotwy0" thumbnail-alt="…" />
        <!-- or: <uni-quote-media-carousel quote="…" author-name="…" author-title="…"> -->
      </div>
      <div slot="caption" class="font-caption">
        <div class="uni-media-carousel__caption-within"><div class="rich-text"><p>Caption…</p></div></div>
      </div>
    </uni-media-carousel-slide>
  </uni-media-carousel-viewport>
  <div slot="controls"><uni-carousel-controls /></div>
</uni-media-carousel>
```

- Full-bleed horizontal rail; first card aligns with the text column, later
  cards peek off the right edge.
- Slide kinds: **YouTube video**, **image**, **quote card** (customer
  testimonial with author + title).
- Caption sits under each card with a round "+" expander for the full text.
- Controls: joined `‹ ›` pill with a thin progress line underneath.
- Argon uses three rails: 5 YouTube clips, 12 quote cards, 5 mixed/brand clips.

**In this repo:** `MediaCarousel` + `MediaCarousel.module.scss`
(`slides` accept `kind: "media"` — image / mp4 / YouTube / Vimeo — or
`kind: "quote"`). Editor: **Image row** block → "+ Quote slide".

---

## 6. Footer "Related stories" rail

```html
<uni-related-articles class="uni-related-articles ga4-carousel">
  <h2 class="uni-related-articles__header font-h3">Related stories</h2>
  <div class="uni-page--fullbleed">
    <uni-carousel>
      <scrollable-cards-panel-viewport step="1">
        <a class="uni-article-card" href="…" data-theme-color="green"
           aria-label="Android - Title - By Authors - Sep 10, 2026">
          <div class="uni-article-card__shape-container">
            <div class="uni-article-card__shape" data-shape-context-consumer='["6-sided-cookie","8-leaf-clover","square"]'>
              <img class="uni-article-card__img" srcset="…300w, …600w" loading="lazy" alt="">
            </div>
          </div>
          <div class="uni-article-card__content">
            <span class="uni-article-card__eyebrow font-eyebrow">Android</span>
            <h3 class="uni-article-card__title font-h5">…</h3>
          </div>
        </a>
      </scrollable-cards-panel-viewport>
    </uni-carousel>
  </div>
</uni-related-articles>
```

**UI anatomy**

| Part | Style |
|---|---|
| Section heading | "Related stories", h3, aligned to text column |
| Card | Vertical: image blob on top, eyebrow + title below |
| Image | Square-ish, masked into organic "blob" shapes that vary per card (6-sided cookie, clover, square) |
| Eyebrow | Category name, 14px/500 |
| Title | h5 ~20–22px, 2–3 lines |
| Motion | Horizontal glide, one card per step, arrows + progress line |
| Theme | Per-card `data-theme-color` tints the card background |

**In this repo:** `RelatedCarousel` (blob masks via `BLOBS[]`, pastel fallback
for posts without covers, category **eyebrow** above each title) +
`getRelatedPostsDetailed()` scoring in `src/lib/recommend.ts`. Heading:
**Related stories**. Author/date meta is intentionally replaced by the repo's
date + read-time line.

---

## 7. Related links strip (short articles)

Chrome tips and Flow also carry an in-body **"Related article"** text link
(`uni-cta emphasis="low"`) inside paragraphs — see the "Google AI Educator
Series" and "fruit fly" links. Style: blue underlined inline text, not a card.

**In this repo:** plain `<a>` inside `p` HTML.

---

## 8. Newsletter block

```html
<section class="uni-article-newsletter uni-article-newsletter--bottom uni-article-newsletter--neutral">
  <div class="uni-article-newsletter__background"> <div class="uni-article-newsletter__shape uni-article-newsletter__shape--pill"></div> </div>
  <h2 class="uni-article-newsletter__title font-h3">Get the latest news from Google in your inbox</h2>
  <p class="uni-article-newsletter__description font-body-m">…</p>
  <uni-newsletter-form action="…" method="POST" content-type="blogv2 | article page" />
</section>
```

- Two-column: copy + form on the left, decorative pale "pill" shape on the right.
- Success state swaps the form for "Done. Just one step more." + confirm text.
- Privacy note under the form linking to the privacy policy.

**In this repo:** `NewsletterSection`, `NewsletterForm` (`src/components/site/`).
`compact` stacks the copy above the form so the block can live inside an
article's reading column. Wired into every article page after the comments
(visible when **Newsletter** is enabled in settings), with the real subscriber
count from `getSubscriberCount()`.

---

## 9. Home page sections

In DOM order:

| # | Component | What it is | UI |
|---|---|---|---|
| 1 | `uni-hero-carousel` | 5 evergreen hero slides, `position-maximum="5"`, `role="list"`, `aria-roledescription="slide"` | Big rounded media + eyebrow (`Gemini`) + h2 headline + expand button, one slide at a time |
| 2 | `uni-collection` | Themed band (`uni-collection--theme-light-mint`) with `8-leaf-clover` shape | Tint background, eyebrow + heading "What's new from Google Health" on the left, cards on the right |
| 3 | `uni-flex-card` (×3) | "3-up" story row, each with its own `section_header` | Equal-width cards with media + title |
| 4 | `uni-simple-article-card` (×6) | Compact story cards with `eyebrow`, `headline`, `image-src/srcset` | Image top, eyebrow, headline; used in 2-/3-up grids |
| 5 | `uni-latest-news-feed` | `section-title="The latest"`, `filter-label="Sort by topic"`, `tag-slugs=[{name,slug,theme_color}…]` | Heading + topic filter chips + vertical list of headlines with thumbnails |
| 6 | `uni-newsflash-video-player` | "Quick tips" block, `video-url`, `poster-image-url`, `video-title` | Vertical video card (9:16), poster + play, title + description beside it |
| 7 | Newsletter | See §8 | — |
| 8 | Footer | `uni-footer` with logo, link columns, social icons | — |
| — | `uni-search-bar` | Header search | Magnifier in the nav; opens a search overlay |
| — | `uni-portal` | Teleport target for the newsletter/banner (`portal-id`) | Rendered elsewhere in the DOM |

**In this repo:** `src/app/(site)/page.tsx` now composes
`HeroRail`, `ThreeUp`, `CollectionBand`, `LatestFeed` and `QuickTips` from
`src/components/site/HomeSections.tsx`, plus `NewsletterSection` and
`SiteHeader`/`SiteFooter`. `LatestSection` remains the reusable blog listing
feed. This is a faithful port of the blog.google section rhythm using the
site's own tokens, not a pixel copy.

### 9a. Measured geometry (live DOM, 1440px viewport)

| Element | Value |
|---|---|
| Page content width | 1281px, 12-col grid |
| Hero lead card | 1281×568; radius 24; image column 851px, text column 374px |
| Hero peek card | 311px wide, same 568px height |
| Hero title (peek / lead) | 22/30 → 34/42, weight 400 |
| Eyebrow | 14px / 500, `letter-spacing .2px` |
| Rail controls | arrows 40×36 pill, 1px divider, 2px progress line |
| Simple card | 277×449; square image 245×245; radius 24 |
| Collection card | 277×449 on `rgb(255 255 255 / .4)`, radius 24 |
| Collection copy column | 411px (4/12), heading 32/40 |
| Feed row thumbnail | 200px, 3:2, radius 20 |
| Feed title | 28/36, first row 36/44 |
| Quick tips card | 348×619, `aspect-ratio: 9/16`, `#f8f9fa`, radius 24 |
| `Read article` pill | 14px / 500, 8×16 padding, 1px outline, pill radius |

---

## 10. Listing / collection page (AI products)

```html
<section class="uni-nup">
  <h2 class="uni-nup__headline">Gemini App</h2>
  <div class="uni-nup__cards uni-nup__cards--four">
    <div class="uni-nup__card">
      <a class="uni-nup__article">
        <h3 class="uni-nup__header">New Gemini tools for small business owners</h3>
        <div class="uni-nup__image-container"><img class="uni-nup__image" …></div>
      </a>
    </div>
    …
  </div>
  <div class="uni-nup__cta-container"><uni-cta>View more from Gemini App</uni-cta></div>
</section>
<uni-article-feed title="All the Latest" site-id="2" all-tags="…" />
```

- Page hero (breadcrumb + h1 **Products** + standfirst).
- **N-up product rows**: eyebrow-style h2 group label (`Gemini App`,
  `Developer tools`), four image cards per row, each a headline + image, plus
  a `View more from …` text CTA.
- **All the Latest** feed: the same `uni-simple-article-card`/feed as the home
  page, filtered by the page's tag set.
- Breadcrumbs: `Home › Innovation & AI › Products`.

**In this repo:** `/topics`, `/tags`, `/search` pages with `SearchFilters`.
No grouped N-up rows yet (the feeds are flat); "All the Latest" maps to
`LatestSection`/`ArticleFeed`.

---

## 11. Cross-cutting patterns

| Pattern | blog.google | This repo |
|---|---|---|
| Sticky article header | Logo + article title + blue progress bar | `ArticleProgress` + `SiteHeader` handoff |
| Share | `uni-button-copy-link` | `ShareMenu` |
| In-this-article | Jump links under the hero (`uni-article-jumplinks__section`) | `InThisArticle` |
| Comments | None on blog.google | `Comments` / `ArticleDiscussion` |
| Carousels | `uni-carousel` + `scrollable-cards-panel-viewport step="1"` | `MediaCarousel`, `RelatedCarousel` |
| Motion | Slide 1 card per step, progress line | Same, GSAP for progress strip |
| Card images | Organic blob masks + per-card theme color | `BLOBS[]` in `RelatedCarousel` |

---

## 12. Quick build checklist for a new section

1. Pick the component from the tables above (hero / collection / 3-up / card grid /
   feed / newsflash / carousel / newsletter).
2. Map content: blog.google passes everything as attributes
   (`title`, `eyebrow`, `summary`, `cta`, `imageUrl`, `data-theme-color`).
   Mirror that as props, not hardcoded copy.
3. Reuse tokens from §1 — never hardcode `#f0f3ff` inline again; pull from
   `tokens.css` when a token exists, otherwise define one there.
4. Mobile: cards stack full-width; rails become one-card-per-view with arrows.
5. Accessibility: `role="group"` + `aria-labelledby` on grouped cards (as
   `uni-related-content-tout` does), decorative images `alt=""`, arrows
   labelled "Previous/Next slide".

---

## 13. Page-by-page inventory (what each crawled URL actually contains)

Legend: **UI type** is the reusable pattern; **element** is the production
custom element/class to inspect if the markup is needed again.

### 13.1 Home — https://blog.google/

| # | Section | Element | UI type | Key props |
|---|---|---|---|---|
| 1 | Header | `uni-nav`, `uni-search-bar` | Sticky nav + search overlay | `search-placeholder` |
| 2 | Hero | `uni-hero-carousel` | Full-width evergreen carousel, 5 slides | `position-maximum="5"`, `section-header`, per-slide `data-theme` |
| 3 | Hero slide | `uni-hero-carousel-slide` | Rounded media + eyebrow + h2 + author + CTA | `active`, `data-theme`, `role="listitem"` |
| 4 | 3-up row | `uni-flex-card` ×3 | Equal card row with media + title | `image-src/srcset`, `ga4-context.module_name="3-up"` |
| 5 | Collection band | `uni-collection--theme-light-mint` | Tinted full-width band, heading left + cards right | `data-theme-color`, collection CTA |
| 6 | Collection cards | `uni-simple-article-card` ×3 | Image-top compact card | `headline`, `card-url`, image attrs |
| 7 | Newsletter | `uni-newsletter-form` | Copy + inline subscribe form | `content-type="blogv2 | homepage"`, portal target |
| 8 | Quick tips | `uni-newsflash-video-player` | Vertical 9:16 video card + title/description | `video-url`, `poster-image-url`, `controls` |
| 9 | Latest feed | `uni-latest-news-feed` | Heading + “Sort by topic” chips + headline list | `tag-slugs` (name/slug/theme_color), `max-stories="9"`, `show-images` |
| 10 | Footer | `uni-footer` | Link columns + social CTAs | `uni-cta emphasis="low"` |

### 13.2 Chrome study tips — `…/chrome/tips-for-school-and-studying/`

| # | Section | Element | UI type |
|---|---|---|---|
| 1 | Breadcrumbs | `uni-breadcrumbs` | Home › Products › Chrome |
| 2 | Article hero | `uni-article-hero__title` (`font-h1`), `uni-reading-time` | Large h1 + date/read time + share |
| 3 | Hero media | `uni-video-player` | 16:9 ambient video, `poster`, `video-url`, `loop`, `muted`, `playsinline` |
| 4 | Intro | `uni-article-paragraph` (`col--layout-6`) | 6/12 body measure |
| 5 | Tip sections ×5 | `h2` (`1. Dive deeper…` … `5. Customize…`) | Numbered how-to sections |
| 6 | Inline media inside tips ×5 | `uni-inline-image--full` | 4 with `or-mp4-video-url` (autoplay inline), 1 image-only |
| 7 | Newsletter | `uni-article-newsletter` + `uni-newsletter-form` | “Get the latest news…”, `content-type="blogv2 | article page"` |
| 8 | Related stories | `uni-related-articles` + `uni-carousel` | 3-up blob cards, arrows + progress |
| 9 | Footer | `uni-footer` | Standard |

### 13.3 Flow creative controls — `…/google-labs/new-creative-controls-google-flow/`

| # | Section | Element | UI type |
|---|---|---|---|
| 1 | Breadcrumbs | `uni-breadcrumbs` | Home › Innovation & AI › Google Labs |
| 2 | Hero | `h1.uni-article-hero__title.font-h4` | **Short-post** title scale (h4, not h1) |
| 3 | Share | `uni-button-copy-link` | Copy-link button in hero menu |
| 4 | Body | 1 × `uni-article-paragraph` | Very short post |
| 5 | Inline media | `uni-inline-image--full` + `or-mp4-video-url="…Omni_1.1_X-2_6.mp4"` | Autoplay demo clip |
| 6 | Related stories | `uni-related-articles` | 4 cards; no newsletter block on this short post |
| 7 | Footer | `uni-footer` | Standard |

### 13.4 AI Quests Polar Peaks — `…/ai-quests-polar-peaks/`

| # | Section | Element | UI type |
|---|---|---|---|
| 1 | Breadcrumbs + hero meta | `uni-breadcrumbs`, `uni-reading-time`, share | Standard article shell |
| 2 | Hero media | `uni-video-player` | Poster + mp4, `loop`, `muted`, `playsinline` |
| 3 | Body | `uni-article-paragraph` ×4 | 6/12 measure |
| 4 | Inline gameplay | `uni-inline-image--full` + `or-mp4-video-url="…Gameplay.mp4"` | Autoplay inline media |
| 5 | Related Article tout | `uni-related-content-tout` | Lavender gradient card, eyebrow + h2 + summary + “See more” |
| 6 | Training modules | h2 + body paragraphs | Text-only section |
| 7 | Newsletter | `uni-article-newsletter` + form | Standard article newsletter |
| 8 | Related stories | `uni-related-articles` | 6 cards |
| 9 | Footer | `uni-footer` | Standard |

### 13.5 AI products listing — https://blog.google/innovation-and-ai/products/

| # | Section | Element | UI type |
|---|---|---|---|
| 1 | Breadcrumbs + h1 | `uni-breadcrumbs`, `h1` “Products” | Listing hero |
| 2 | Group row | `uni-nup` + `uni-nup__headline` “Gemini App” | 4-up product cards + “View more …” |
| 3 | Group row | `uni-nup__headline` “Developer tools” | 4-up product cards |
| 4 | Card | `uni-nup__card` / `uni-nup__article` | Headline + image, whole card linked |
| 5 | All the Latest | `uni-article-feed` (`title="All the Latest"`) | Filtered article feed using `uni-simple-article-card` |
| 6 | Footer | `uni-footer` | Standard |

---

## 14. Repo implementation status

| Feature | blog.google source | Repo status | Where |
|---|---|---|---|
| Sticky header + search | `uni-nav`, `uni-search-bar` | ✅ | `SiteHeader`, `/search` |
| Reading progress | article hero + progress bar | ✅ | `ArticleProgress` |
| Article shell / 12-col grid | `uni-grid__col--layout-6` | ✅ | `post.module.scss` |
| Breadcrumbs | `uni-breadcrumbs` | ✅ | article page |
| Share / copy link | `uni-button-copy-link` | ✅ | `ShareMenu` |
| In-this-article | `uni-article-jumplinks` | ✅ | `InThisArticle` |
| Related Article tout | `uni-related-content-tout` | ✅ | `related` block in `PostContent` |
| Related stories rail | `uni-related-articles` | ✅ (+ category eyebrow now) | `RelatedCarousel` |
| Inline image + autoplay mp4 | `uni-inline-image` | ✅ (video block `poster` + `autoplay`) | `VideoEmbed` |
| Hero video | `uni-video-player` | ⚠️ cover image only | article hero |
| Newsletter band | `uni-article-newsletter` | ✅ + compact article variant | `NewsletterSection` |
| Latest feed + topic chips | `uni-latest-news-feed` | ✅ | `LatestFeed` (home) / `LatestSection` (`/blog`) |
| Simple article grid | `uni-simple-article-card` | ✅ | `LatestSection` `grid` |
| 3-up row | `uni-flex-card` | ✅ | `ThreeUp` |
| Collection tinted band | `uni-collection` | ✅ | `CollectionBand` |
| Hero carousel / rail | `uni-hero-carousel` | ✅ scroll rail (not timed carousel) | `HeroRail` |
| Quick tips vertical video | `uni-newsflash-video-player` | ✅ | `QuickTips` |
| N-up grouped product rows | `uni-nup` | ❌ | `/topics` is flat |
| Short-post layout | `font-h4` title, no newsletter | ❌ | all articles use h1 scale |
| Related links strip | inline `uni-cta` | ✅ | rich text links |
| In-flow jump links | `uni-article-jumplinks` | ✅ | `jumplinks` block → `jumpChips` |
| Media carousel | `uni-media-carousel` | ✅ | `MediaCarousel` |
| Comments | none | extra | `ArticleDiscussion` |

### Highest-value remaining gaps

1. **Short-post layout** — Flow uses a smaller title and skips the newsletter;
   easy conditional in the article page/editor.
2. **N-up grouped rows** — useful if `/topics` becomes a product-style index.
3. **Article hero video** — extend `cover` with `videoUrl` + `poster` (the
   `video` block's poster/autoplay work is the foundation).
4. **Timed auto-advance hero** — the repo uses a scroll-snap `HeroRail`;
   blog.google's hero is a carousel with one active slide.
