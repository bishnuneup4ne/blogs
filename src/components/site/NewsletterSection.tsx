import Link from "next/link";
import { NewsletterForm } from "./NewsletterForm";
import styles from "./NewsletterSection.module.scss";
import { routes } from "@/lib/routes";

/* Newsletter — an editorial closing block: headline, a short paragraph,
   what you get, and the form card. Hand-drawn accents (butterfly, arrow,
   satellite) are scattered between the blocks so the page closes in the same
   hand it opened with. */
export function NewsletterSection({ name }: { name?: string }) {
  return (
    <section className={styles.wrap} id="newsletter" aria-labelledby="newsletter-title">
      <div className={styles.head}>
        <h2 id="newsletter-title" className={styles.title}>
          Get the latest from {name ?? "Bishnu"} in your{" "}
          <span className={styles.inbox}>inbox.</span>
        </h2>

        {/* Hand-drawn arrow pointing down into the form. */}
        <svg className={styles.doodleArrow} viewBox="0 0 120 90" fill="none" aria-hidden="true">
          <path d="M10 8c34 8 62 30 74 62" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M70 62l12 10 4-17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.desc}>
            Sign up for updates when new posts go up. Notes from my desk, the occasional
            photograph — roughly one email a fortnight, no noise.
          </p>

        </div>

        <div className={styles.formCard}>
          {/* Satellite doodle above the card, as a quiet accent. */}
          <svg className={styles.doodleSatellite} viewBox="0 0 96 72" fill="none" aria-hidden="true">
            <rect x="38" y="26" width="20" height="22" rx="3" fill="#fff" stroke="currentColor" strokeWidth="1.3" />
            <rect x="16" y="30" width="18" height="14" rx="2" fill="currentColor" />
            <rect x="62" y="30" width="18" height="14" rx="2" fill="currentColor" />
            <path d="M48 26V12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M40 12h16" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <circle cx="73" cy="17" r="3.4" fill="var(--yellow-500)" />
          </svg>
          <NewsletterForm />
          <p className={styles.note}>
            Your information will be used in accordance with the site&apos;s{" "}
            <Link href={routes.privacy}>privacy policy</Link>. You may opt out at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
