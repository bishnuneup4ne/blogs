import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./NewsletterSection.module.scss";

const FRAMES = [
  { src: "/images/cover-trail.jpg", alt: "Trail above the clouds" },
  { src: "/images/cover-himalaya.jpg", alt: "Himalaya at first light" },
  { src: "/images/cover-morning.jpg", alt: "Morning desk" },
];

export function NewsletterSection({ name }: { name?: string }) {
  return (
    <section className={styles.wrap} id="newsletter" aria-labelledby="newsletter-title">
      <div className={styles.inner}>
        <h2 id="newsletter-title" className={styles.title}>
          Get the latest from {name ?? "Bishnu"} in your inbox
        </h2>
        <p className={styles.desc}>
          Sign up for updates when new posts go up: work notes, field notes, and the occasional photograph.
          Roughly one email a fortnight, no noise.
        </p>

        <NewsletterForm />

        <p className={styles.note}>
          Your information will be used in accordance with the site&apos;s{" "}
          <Link href="/privacy">privacy policy</Link>. You may opt out at any time.{" "}
          <Link href="/newsletter">Read more about the newsletter →</Link>
        </p>
      </div>

      <div className={styles.frames} aria-hidden="true">
        {FRAMES.map((f, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={f.src} src={f.src} alt="" className={`${styles.frame} ${styles[`frame${i}`]}`} loading="lazy" />
        ))}
      </div>
    </section>
  );
}
