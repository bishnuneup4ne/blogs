import type { Metadata } from "next";
import { relativeDate } from "@/lib/dates";
import Link from "next/link";
import Image from "next/image";
import { SearchFilters } from "@/components/site/SearchFilters";
import { SearchClear } from "./search-clear";
import { getAlbums, getAllPosts, getCategory } from "@/lib/data";
import type { Post } from "@/lib/types";

import styles from "./search.module.scss";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the archive.",
  robots: { index: false, follow: true },
};

function score(post: { title: string; description: string; tags: string[] }, terms: string[]) {
  const hay = `${post.title} ${post.description} ${post.tags.join(" ")}`.toLowerCase();
  let s = 0;
  for (const t of terms) {
    if (!hay.includes(t)) return -1;
    if (post.title.toLowerCase().includes(t)) s += 10;
    if (post.tags.some((tag) => tag.toLowerCase().includes(t))) s += 4;
    s += 1;
  }
  return s;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const topic = typeof sp.topic === "string" ? sp.topic : "";
  const sort = (typeof sp.sort === "string" ? sp.sort : "relevance") as "relevance" | "newest" | "oldest";
  const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);

  function matches(post: Post, terms: string[]) {
    if (terms.length === 0) return true;
    const hay = `${post.title} ${post.description} ${post.tags.join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  }

  let results = (await getAllPosts()).filter((p) => matches(p, terms));
  if (topic) results = results.filter((p) => p.category === topic);
  if (sort === "newest") results = [...results].sort((a, b) => (a.date < b.date ? 1 : -1));
  else if (sort === "oldest") results = [...results].sort((a, b) => (a.date > b.date ? 1 : -1));
  else
    results = [...results]
      .map((post) => ({ post, s: score(post, terms) }))
      .sort((a, b) => b.s - a.s || (a.post.date < b.post.date ? 1 : -1))
      .map((x) => x.post);

  const albums = terms.length
    ? (await getAlbums()).filter((a) =>
        terms.every((t) => `${a.title} ${a.subtitle}`.toLowerCase().includes(t)),
      )
    : [];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={routes.home}>Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Search</span>
      </nav>

      <form id="search-form" action="/search" method="get" className={styles.searchBar}>
        <SearchIcon />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Ask us a question, or tell us what you're looking for."
          aria-label="Search"
        />
        {q ? <SearchClear /> : null}
      </form>

      <SearchFilters total={results.length + albums.length} />

      {results.length + albums.length === 0 ? (
        <div className={styles.none}>
          <p className={styles.noneTitle}>{q ? <>No results for “{q}”.</> : "Nothing filed here yet."}</p>
          <p className={styles.noneBody}>
            Check the spelling, or <Link href={routes.blog}>browse the full feed</Link>.
          </p>
        </div>
      ) : (
        <>
          <ul className={styles.results}>
            {results.map((post) => {
              const category = getCategory(post.category);
              return (
                <li key={post.slug} className={styles.result}>
                  <div className={styles.resultText}>
                    <p className={styles.kicker}>
                      {new Date(`${post.date}T00:00:00Z`).toLocaleDateString("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).toUpperCase()} / {category.name.toUpperCase()}
                    </p>
                    <h2 className={styles.resultTitle}>
                      <Link href={routes.post(post.slug)}>{highlight(post.title, terms)}</Link>
                    </h2>                     <p className={styles.byline}>{post.readingMinutes} min read · {relativeDate(post.date)}</p>
                  </div>
                  {post.cover ? (
                    <Link href={routes.post(post.slug)} className={styles.thumb} tabIndex={-1} aria-hidden="true">
                      <Image src={post.cover.src} alt="" fill sizes="260px" loading="lazy" className={styles.thumbImg} />
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>

          {albums.length > 0 ? (
            <section className={styles.albums} aria-labelledby="albums-heading">
              <h2 id="albums-heading" className="section-title">Photo albums</h2>
              <div className={styles.albumRow}>
                {albums.map((album) => (
                  <Link key={album.slug} href={`/gallery/${album.slug}`} className={styles.album}>
                    <span className={styles.albumMedia}>
                      {/* A coverless album has cover === "" — next/image throws
                          on an empty src, which 500s the whole search page. */}
                      {album.cover ? (
                        <Image src={album.cover} alt={album.title} fill sizes="300px" className={styles.thumbImg} />
                      ) : null}
                    </span>
                    <span className={styles.albumTitle}>{album.title}</span>
                    <span className={styles.albumMeta}>{album.photos.length} {album.photos.length === 1 ? "photo" : "photos"}</span>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function highlight(text: string, terms: string[]) {
  if (!terms.length) return text;
  const lookup = new Set(terms);
  const pattern = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return text.split(pattern).map((part, i) =>
    part && lookup.has(part.toLowerCase()) ? <mark key={i}>{part}</mark> : part,
  );
}

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
