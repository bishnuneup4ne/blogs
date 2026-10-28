import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { PageHero } from "@/components/site/PageHero";
import { RelatedCarousel } from "@/components/blog/RelatedCarousel";
import { SectionHead } from "@/components/site/sections";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import styles from "./newsletter.module.scss";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Newsletter",
  description: "One email when something worth reading goes up. No schedule, no filler.",
  alternates: { canonical: "/newsletter" },
  openGraph: {
    url: "/newsletter",
    title: "Newsletter",
    description: "One email when something worth reading goes up. No schedule, no filler.",
  },
};


export default async function NewsletterPage() {
  const [posts, settings] = await Promise.all([getAllPosts(), getSettings()]);

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href={routes.home}>Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Newsletter</span>
          </nav>

          <PageHero
            title="Notes worth an inbox."
            lede="New posts land here first, with a short note on what I'm building, breaking and photographing. Roughly once a fortnight — never more."
          >
            {settings.toggles.newsletter ? (
              <>
                <div className={styles.formWrap}>
                  <NewsletterForm variant="pill" />
                </div>
                <p className={styles.privacy}>
                  No spam, no tracking pixels. Unsubscribe from any email. Read the{" "}
                  <Link href={routes.privacy}>privacy policy</Link>.
                </p>
              </>
            ) : (
              <p className={styles.privacy}>The newsletter is closed right now. New posts are still on the blog and in the RSS feed.</p>
            )}
          </PageHero>
        </div>
      </header>

      <div className={styles.inner}>
        <section className={styles.section} aria-label="The latest">
          <SectionHead title="The latest" href={routes.blog} linkLabel="Browse all posts" />
          <p className={styles.sectionLede}>
            {posts.length} posts on systems, security and the slow things in between — newest first.
          </p>
          {posts.length > 0 ? (
            <RelatedCarousel items={posts.map((post) => ({ post, score: 0, sharedTags: [] }))} />
          ) : (
            <p className={styles.empty}>No posts are published yet. Check back soon.</p>
          )}
        </section>

        <p className={styles.foot}>
          Everything is free and public. <Link href="/rss.xml">RSS feed</Link> if you prefer a reader.
        </p>
      </div>
    </>
  );
}