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

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">About</span>
          </nav>

          <div className={styles.mastheadGrid}>
            <div className={styles.mastheadCopy}>
              <p className={styles.kicker}>{a.kicker}</p>
              <h1 className={styles.title}>{a.title}</h1>
              <p className={styles.lede}>{a.lede}</p>

              {a.focus.length > 0 ? (
                <ul className={styles.focus} aria-label="Areas of focus">
                  {a.focus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}

              {a.quote ? <blockquote className={styles.quote}>&ldquo;{a.quote}&rdquo;</blockquote> : null}

              <div className={styles.actions}>
                <a href={`mailto:${settings.identity.email}`} className="btn btn-primary">Email me</a>
                <Link href="/blog" className="btn btn-outline">Read the write-ups</Link>
              </div>
            </div>

            {a.portraitUrl ? (
              <div className={styles.mastheadMedia}>
                <Image
                  src={a.portraitUrl}
                  alt={a.portraitAlt}
                  fill
                  priority
                  sizes="(max-width: 900px) 100vw, 440px"
                  className={styles.portraitImg}
                />
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className={styles.inner}>
        <div className={styles.layout}>
          <div className={styles.main}>
            {a.story.length > 0 ? (
              <section className={styles.section} aria-labelledby="story-heading">
                <h2 id="story-heading" className={styles.sectionTitle}>Why one place</h2>
                <div className={styles.prose}>
                  {a.story.map((para, i) => <p key={i}>{para}</p>)}
                </div>
              </section>
            ) : null}

            {a.now.length > 0 ? (
              <section className={styles.section} aria-labelledby="now-heading">
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
              <section className={styles.section} aria-labelledby="timeline-heading">
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
      </div>
      {settings.toggles.contactForm ? <ContactForm /> : null}
    </>
  );
}