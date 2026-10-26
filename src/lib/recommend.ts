/* Content-based recommender: TF-IDF over title/description/tags/body with
   cosine similarity, boosted by shared tags and topic. Used for "Related
   stories" and "Read next". */

import type { Post } from "./types";

const STOPWORDS = new Set(
  `a about above after again against all am an and any are aren't as at be because been before being below between both but by can cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't having he her here hers herself him himself his how i if in into is isn't it its itself let's me more most must my myself no nor not of off on once only or other ought our ours ourselves out over own same shan't she should shouldn't so some such than that the their theirs them themselves then there these they this those through to too under until up very was wasn't we were weren't what when where which while who whom why with won't would wouldn't you your yours yourself yourselves also still even much many one two get got make made read writing write things thing really lot keep kept`
    .split(/\s+/),
);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Weighted term vector per post: title hits count extra, tags count extra,
// body words once. Normalized to unit length for cosine similarity.
function buildVector(post: Post): Map<string, number> {
  const counts = new Map<string, number>();
  const add = (words: string[], weight: number) => {
    for (const w of words) counts.set(w, (counts.get(w) ?? 0) + weight);
  };
  add(tokenize(post.title), 3);
  add(tokenize(post.tags.join(" ")), 2.5);
  add(tokenize(post.description), 1.5);
  for (const b of post.blocks) {
    if (b.type === "p" || b.type === "quote" || b.type === "callout") add(tokenize(b.html), 1);
    else if (b.type === "h2" || b.type === "h3") add(tokenize(b.text), 2);
    else if (b.type === "list") add(tokenize(b.items.join(" ")), 1);
  }
  // IDF-ish dampening of ultra-common terms within this corpus is approximated
  // by sqrt-scaling raw counts so long posts don't dominate.
  let norm = 0;
  for (const [t, c] of counts) {
    const v = Math.sqrt(c);
    counts.set(t, v);
    norm += v * v;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [t, v] of counts) counts.set(t, v / norm);
  return counts;
}

function cosine(a: Map<string, number>, b: Map<string, number>): number {
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [t, v] of small) {
    const w = big.get(t);
    if (w) dot += v * w;
  }
  return dot;
}

export interface ScoredPost {
  post: Post;
  score: number;
  sharedTags: string[];
}

export function rankRelated(target: Post, pool: Post[], limit = 6): ScoredPost[] {
  const vectors = new Map<string, Map<string, number>>();
  for (const p of pool) vectors.set(p.slug, buildVector(p));
  const self = vectors.get(target.slug) ?? buildVector(target);

  const scored = pool
    .filter((p) => p.slug !== target.slug)
    .map((p) => {
      const sharedTags = p.tags.filter((t) => target.tags.includes(t));
      let score = cosine(self, vectors.get(p.slug)!) * 4; // content similarity 0..~4
      score += sharedTags.length * 1.5; // explicit tag intent
      if (p.category === target.category) score += 1; // same topic
      if (p.author.name === target.author.name) score += 0.25;
      return { post: p, score, sharedTags };
    })
    .filter((x) => x.score >= 0.4)
    .sort((a, b) => b.score - a.score || (a.post.date < b.post.date ? 1 : -1));

  return scored.slice(0, limit);
}
