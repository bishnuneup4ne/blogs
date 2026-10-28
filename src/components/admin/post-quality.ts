import type { Block } from "@/lib/types";

export type CheckLevel = "pass" | "warn" | "fail";
export type CheckGroup = "search" | "content" | "media";

export interface QualityCheck {
  id: string;
  group: CheckGroup;
  label: string;
  level: CheckLevel;
  detail: string;
}

export interface QualityInput {
  title: string;
  slug: string;
  summary: string;
  cover: string | null;
  coverAlt: string;
  blocks: Block[];
  tags: string[];
  category: string;
  words: number;
}

const plain = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();

function headingTexts(blocks: Block[]): string[] {
  return blocks.flatMap((b) => (b.type === "h2" || b.type === "h3" ? [b.text.trim().toLowerCase()] : [])).filter(Boolean);
}

function imageBlocks(blocks: Block[]) {
  const out: { src: string; alt: string }[] = [];
  for (const b of blocks) {
    if (b.type === "image" && b.src) out.push({ src: b.src, alt: b.alt });
    if (b.type === "imgtext" && b.src) out.push({ src: b.src, alt: b.alt });
    if (b.type === "row") for (const item of b.items) if (item.kind !== "quote" && item.src) out.push({ src: item.src, alt: item.alt ?? "" });
    if (b.type === "bafter") out.push({ src: b.after, alt: b.alt ?? "" });
  }
  return out;
}

/** Internal links inside a post's rich text, so dead links are caught before publishing. */
function linkHrefs(blocks: Block[]): string[] {
  const hrefs: string[] = [];
  for (const b of blocks) {
    if (!("html" in b) || typeof b.html !== "string") continue;
    for (const match of b.html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)) hrefs.push(match[1]);
  }
  return hrefs;
}

export function runChecks(input: QualityInput): QualityCheck[] {
  const checks: QualityCheck[] = [];
  const heading = input.title.trim();
  const description = input.summary.trim();
  const headings = headingTexts(input.blocks);
  const images = imageBlocks(input.blocks);
  const bodyText = input.blocks
    .map((b) => ("html" in b && typeof b.html === "string" ? plain(b.html) : "text" in b ? b.text : ""))
    .join(" ")
    .trim();

  /* ---------- Search ---------- */
  checks.push(
    heading.length === 0
      ? { id: "title", group: "search", label: "Title", level: "fail", detail: "Every post needs a headline." }
      : heading.length < 15
        ? { id: "title", group: "search", label: "Title", level: "warn", detail: "Short headline — 15–60 characters reads best in search." }
        : heading.length > 70
          ? { id: "title", group: "search", label: "Title", level: "warn", detail: `${heading.length} characters — search may cut it at about 60.` }
          : { id: "title", group: "search", label: "Title", level: "pass", detail: `${heading.length} characters — a good length.` },
  );

  checks.push(
    description.length === 0
      ? { id: "summary", group: "search", label: "Standfirst", level: "fail", detail: "Add a sentence — it becomes the card and search description." }
      : description.length < 70
        ? { id: "summary", group: "search", label: "Standfirst", level: "warn", detail: `${description.length} characters — aim for 70–160.` }
        : description.length > 200
          ? { id: "summary", group: "search", label: "Standfirst", level: "warn", detail: `${description.length} characters — trim to about 160.` }
          : { id: "summary", group: "search", label: "Standfirst", level: "pass", detail: `${description.length} characters — good for search and cards.` },
  );

  const slugOk = Boolean(input.slug) && input.slug.length <= 80;
  checks.push({
    id: "slug",
    group: "search",
    label: "URL",
    level: slugOk ? "pass" : "warn",
    detail: slugOk ? `/${input.slug}` : "Missing or longer than 80 characters.",
  });

  checks.push({
    id: "topic",
    group: "search",
    label: "Topic",
    level: input.category ? "pass" : "warn",
    detail: input.category ? `Filed under ${input.category}.` : "Posts without a topic fall out of every topic page.",
  });

  checks.push({
    id: "tags",
    group: "search",
    label: "Tags",
    level: input.tags.length >= 2 ? "pass" : input.tags.length === 1 ? "warn" : "fail",
    detail:
      input.tags.length >= 2
        ? `${input.tags.length} tags — enough to connect this with related posts.`
        : "Add at least two tags so related stories can find this one.",
  });

  /* ---------- Content ---------- */
  checks.push(
    input.words < 200
      ? { id: "length", group: "content", label: "Body length", level: input.words < 60 ? "fail" : "warn", detail: `${input.words} words — under 200 rarely earns its place in search.` }
      : { id: "length", group: "content", label: "Body length", level: "pass", detail: `${input.words.toLocaleString()} words.` },
  );

  checks.push(
    headings.length === 0
      ? { id: "headings", group: "content", label: "Section headings", level: "warn", detail: "No subheadings — long text is hard to scan." }
      : { id: "headings", group: "content", label: "Section headings", level: "pass", detail: `${headings.length} heading${headings.length === 1 ? "" : "s"} break the piece up.` },
  );

  const duplicates = headings.filter((h, i) => headings.indexOf(h) !== i);
  checks.push({
    id: "duplicate-headings",
    group: "content",
    label: "Unique headings",
    level: duplicates.length ? "warn" : "pass",
    detail: duplicates.length ? `Repeated: ${[...new Set(duplicates)].slice(0, 3).join(", ")}` : "Every heading is distinct.",
  });

  const emptyBlocks = input.blocks.filter((b) => {
    if (b.type === "p") return plain(b.html).length === 0;
    if (b.type === "image") return !b.src;
    if (b.type === "list") return b.items.every((i) => !i.trim());
    return false;
  }).length;
  checks.push({
    id: "empty-blocks",
    group: "content",
    label: "Empty blocks",
    level: emptyBlocks ? "warn" : "pass",
    detail: emptyBlocks ? `${emptyBlocks} empty block${emptyBlocks === 1 ? "" : "s"} — invisible on the site, but they clutter the editor.` : "Nothing empty.",
  });

  const external = linkHrefs(input.blocks).filter((h) => /^https?:\/\//i.test(h));
  checks.push({
    id: "links",
    group: "content",
    label: "Links",
    level: external.length ? "pass" : "warn",
    detail: external.length
      ? `${external.length} outbound link${external.length === 1 ? "" : "s"}.`
      : "No outbound links — linking a source adds trust.",
  });

  /* ---------- Media ---------- */
  checks.push(
    input.cover
      ? { id: "cover", group: "media", label: "Cover image", level: "pass", detail: "Set — it appears on cards and the article header." }
      : { id: "cover", group: "media", label: "Cover image", level: "warn", detail: "No cover. Cards will fall back to a plain tint." },
  );

  const missingAlt = images.filter((i) => !i.alt.trim()).length;
  checks.push({
    id: "alt",
    group: "media",
    label: "Image descriptions",
    level: images.length === 0 ? "warn" : missingAlt ? "fail" : "pass",
    detail:
      images.length === 0
        ? "No images in the body."
        : missingAlt
          ? `${missingAlt} of ${images.length} images have no alt text.`
          : `All ${images.length} images described.`,
  });

  const coverAltOk = !input.cover || input.coverAlt.trim().length > 0;
  checks.push({
    id: "cover-alt",
    group: "media",
    label: "Cover description",
    level: coverAltOk ? "pass" : "warn",
    detail: coverAltOk ? "Cover is described for screen readers." : "Add a description for the cover image.",
  });

  return checks;
}

export function scoreChecks(checks: QualityCheck[]): { passed: number; total: number; pct: number } {
  const total = checks.length;
  const passed = checks.filter((c) => c.level === "pass").length;
  return { passed, total, pct: total ? Math.round((passed / total) * 100) : 0 };
}

/** Headings in document order, for the outline and jump-to links. */
export function outlineOf(blocks: Block[]) {
  return blocks.flatMap((b, index) =>
    b.type === "h2" || b.type === "h3"
      ? [{ id: b.id, text: b.text || "Untitled heading", level: b.type === "h2" ? 2 : 3, index }]
      : [],
  );
}
