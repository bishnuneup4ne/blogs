import type { Metadata } from "next";
import Link from "next/link";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import { PostRail } from "@/components/site/PostRail";
import { getAllPosts } from "@/lib/data";
import { getSettings } from "@/lib/settings";
import styles from "./newsletter.module.scss";

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
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">Newsletter</span>
          </nav>

          <p className={styles.kicker}>Newsletter</p>
          <h1 className={styles.title}>Notes worth an inbox.</h1>
          <p className={styles.lede}>
            New posts land here first, with a short note on what I&apos;m building, breaking and
            photographing. Roughly once a fortnight — never more.
          </p>

          {settings.toggles.newsletter ? (
            <div className={styles.formWrap}>
              <NewsletterForm />
              <p className={styles.privacy}>
                No spam, no tracking pixels. Unsubscribe from any email. Read the{" "}
                <Link href="/privacy">privacy policy</Link>.
              </p>
            </div>
          ) : (
            <p className={styles.privacy}>The newsletter is closed right now. New posts are still on the blog and in the RSS feed.</p>
          )}
        </div>
      </header>

      <div className={styles.inner}>
        <section className={styles.section} aria-labelledby="recent-heading">
          <div className={styles.recentHead}>
            <h2 id="recent-heading" className={styles.sectionTitle}>The latest</h2>
            <Link href="/blog" className="btn btn-outline">Browse all posts</Link>
          </div>
          <p className={styles.sectionLede}>
            {posts.length} posts on systems, security and the slow things in between — newest first.
          </p>
          {posts.length > 0 ? (
            <PostRail posts={posts} />
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
