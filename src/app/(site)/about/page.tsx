import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ContactForm } from "@/components/site/ContactForm";
import { getSettings } from "@/lib/settings";
import styles from "./about.module.scss";

const description =
  "About Bishnu Neupane — cybersecurity enthusiast, low-level hacker and reverse engineer from Kathmandu. BE Computer Engineering student at NCIT exploring penetration testing, malware and AI-assisted development.";

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "About", description, type: "profile" },
};

export default async function AboutPage() {
  const settings = await getSettings();
  const a = settings.about;
  const sections = [
    a.story.length > 0 ? { id: "story", label: "Why one place" } : null,
    a.now.length > 0 ? { id: "now", label: "Now" } : null,
    a.timeline.length > 0 ? { id: "timeline", label: "Timeline" } : null,
  ].filter((s): s is { id: string; label: string } => Boolean(s));

  return (
    <>
      <header className={styles.masthead}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">›</span>
          <span aria-current="page">About</span>
        </nav>

        <div className={styles.mastheadGrid}>
          <div className={styles.portrait}>
            {a.imageUrl ? (
              <Image
                src={a.imageUrl}
                alt={a.imageAlt}
                fill
                priority
                sizes="(max-width: 900px) 60vw, 340px"
                className={styles.portraitImg}
              />
            ) : null}
          </div>

          <div className={styles.mastheadCopy}>
            <p className={styles.kicker}>{a.kicker}</p>
            <h1 className={styles.title}>{a.title}</h1>
            <p className={styles.lede}>{a.lede}</p>

            <div className={styles.actions}>
              <a href={`mailto:${settings.identity.email}`} className={styles.primaryCta}>
                Get in touch
                <Arrow />
              </a>
              <Link href="/blog" className={styles.secondaryCta}>
                Read the write-ups
              </Link>
            </div>
          </div>
        </div>

        {a.focus.length > 0 ? (
          <ul className={styles.focus} aria-label="Areas of focus">
            {a.focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </header>

      <div className={styles.body}>
        {sections.length > 1 ? (
          <aside className={styles.toc} aria-label="On this page">
            <p className={styles.tocLabel}>On this page</p>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.label}</a>
                </li>
              ))}
            </ol>
          </aside>
        ) : null}

        <div className={styles.main}>
          {a.story.length > 0 ? (
            <section id="story" className={styles.section} aria-labelledby="story-heading">
              <p className={styles.sectionKicker}>Background</p>
              <h2 id="story-heading" className={styles.sectionTitle}>Why one place</h2>
              <div className={styles.prose}>
                {a.story.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </section>
          ) : null}

          {a.quote ? (
            <blockquote className={styles.quote}>
              <p>{a.quote}</p>
            </blockquote>
          ) : null}

          {a.now.length > 0 ? (
            <section id="now" className={styles.section} aria-labelledby="now-heading">
              <p className={styles.sectionKicker}>Right now</p>
              <h2 id="now-heading" className={styles.sectionTitle}>Now</h2>
              <dl className={styles.now}>
                {a.now.map((item) => (
                  <div key={item.label} className={styles.nowRow}>
                    <dt className={styles.nowLabel}>{item.label}</dt>
                    <dd className={styles.nowValue}>{item.value}</dd>
                  </div>
                ))}
              </dl>
              {a.updated ? <p className={styles.foot}>Updated {a.updated}</p> : null}
            </section>
          ) : null}

          {a.timeline.length > 0 ? (
            <section id="timeline" className={styles.section} aria-labelledby="timeline-heading">
              <p className={styles.sectionKicker}>Path</p>
              <h2 id="timeline-heading" className={styles.sectionTitle}>A short timeline</h2>
              <ol className={styles.timeline}>
                {a.timeline.map((item, i) => (
                  <li key={`${item.year}-${i}`}>
                    <span className={styles.year}>{item.year}</span>
                    <div className={styles.timelineBody}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}
        </div>
      </div>

      {settings.toggles.contactForm ? <ContactForm /> : null}
    </>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
