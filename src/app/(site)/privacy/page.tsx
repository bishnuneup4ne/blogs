import type { Metadata } from "next";
import Link from "next/link";
import { getSettings } from "@/lib/settings";
import styles from "./privacy.module.scss";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What this site collects, why, and how to have it removed.",
  alternates: { canonical: "/privacy" },
  openGraph: { url: "/privacy", title: "Privacy", description: "What this site collects, why, and how to have it removed." },
};

export default async function PrivacyPage() {
  const settings = await getSettings();

  return (
    <article className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href={routes.home}>Home</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">Privacy</span>
      </nav>

      <header className={styles.header}>
        <p className={styles.kicker}>Privacy</p>
        <h1 className={styles.title}>Short version: I collect as little as possible.</h1>
        <p className={styles.lede}>
          This is a personal blog, not an advertising business. There are no third-party ad
          trackers, no fingerprinting scripts and no data sold to anyone.
        </p>
        <p className={styles.updated}>Last updated 26 October 2026</p>
      </header>

      <div className={styles.prose}>
        <section>
          <h2>What I collect</h2>
          <ul>
            <li>
              <strong>Newsletter email.</strong> If you subscribe, your email address is stored so
              the newsletter can be sent. You can unsubscribe from any email or ask me to delete it.
            </li>
            <li>
              <strong>Contact messages.</strong> If you send a message, I keep the content and your
              email long enough to reply.
            </li>
            <li>
              <strong>Aggregate views.</strong> Posts count page views without storing an IP address,
              account or persistent visitor identifier.
            </li>
            <li>
              <strong>Admin session.</strong> The private admin area sets a signed, HTTP-only cookie.
              It is not used on public pages and is not an analytics cookie.
            </li>
          </ul>
        </section>

        <section>
          <h2>Services that process data</h2>
          <p>
            The site uses Supabase for its database and image storage, and may use an email
            provider to deliver the newsletter. Those providers process data on my behalf and only
            for providing the service.
          </p>
        </section>

        <section>
          <h2>What I do not do</h2>
          <ul>
            <li>No advertising profiles or cross-site tracking.</li>
            <li>No selling or renting personal data.</li>
            <li>No newsletter tracking pixels in outgoing email.</li>
          </ul>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>
            You can ask for a copy of your data, correct it, or have it deleted. Email{" "}
            <a href={`mailto:${settings.identity.email}`}>{settings.identity.email}</a> and I will
            sort it out. You can also unsubscribe using the link in any newsletter email.
          </p>
        </section>

        <section>
          <h2>Changes</h2>
          <p>
            If this policy changes in a meaningful way, the date at the top will change. Questions
            are always welcome at the address above.
          </p>
        </section>
      </div>

      <p className={styles.foot}>
        <Link href={routes.newsletter}>About the newsletter</Link>
        <span aria-hidden="true">·</span>
        <Link href={routes.about}>About this site</Link>
      </p>
    </article>
  );
}
