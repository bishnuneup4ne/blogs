import Link from "next/link";
import Image from "next/image";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./NewsletterSection.module.scss";

/* blog.google newsletter footer: big "…in your inbox." headline, form card on
   the right, and a reader row — avatar stack + "Join N readers" line. */
export function NewsletterSection({
  name,
  authorName,
  avatarUrl,
  subscriberCount,
}: {
  name?: string;
  authorName?: string;
  avatarUrl?: string;
  subscriberCount?: number;
}) {
  return (
    <section className={styles.wrap} id="newsletter" aria-labelledby="newsletter-title">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <span className={styles.kicker}>Newsletter</span>
          <h2 id="newsletter-title" className={styles.title}>
            Get the latest from {name ?? "Bishnu"} in your{" "}
            <span className={styles.inbox}>inbox.</span>
          </h2>
          <p className={styles.desc}>
            Sign up for updates when new posts go up. Notes from my desk, the occasional photograph — roughly
            one email a fortnight, no noise.
          </p>
          {subscriberCount && subscriberCount > 0 ? (
            <div className={styles.readers}>
              <span className={styles.avatars} aria-hidden="true">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className={styles.avatarMine} width={40} height={40} />
                ) : null}
                <span className={`${styles.avatarGhost} ${styles.a1}`}>N</span>
                <span className={`${styles.avatarGhost} ${styles.a2}`}>P</span>
                <span className={`${styles.avatarGhost} ${styles.a3}`}>S</span>
              </span>
              <span className={styles.readersLine}>
                Join <strong>{subscriberCount.toLocaleString()}</strong>{" "}
                {subscriberCount === 1 ? "reader" : "readers"} —{" "}
                <Link href="/about" className={styles.aboutLink}>what I write about</Link>
              </span>
            </div>
          ) : (
            <div className={styles.readers}>
              <span className={styles.avatars} aria-hidden="true">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className={styles.avatarMine} width={40} height={40} />
                ) : null}
                <span className={`${styles.avatarGhost} ${styles.a1}`}>N</span>
                <span className={`${styles.avatarGhost} ${styles.a2}`}>P</span>
              </span>
              <span className={styles.readersLine}>
                Be the first to read — <Link href="/about" className={styles.aboutLink}>what I write about</Link>
              </span>
            </div>
          )}
        </div>

        <div className={styles.formCard}>
          <NewsletterForm />
          <p className={styles.note}>
            Your information will be used in accordance with the site&apos;s{" "}
            <Link href="/privacy">privacy policy</Link>. You may opt out at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
