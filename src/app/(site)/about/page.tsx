import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/site/ContactForm";
import { getSettings } from "@/lib/settings";
import { site } from "@/lib/site";
import styles from "./about.module.scss";

const description =
  "About Bishnu Neupane — cybersecurity enthusiast, low-level hacker and reverse engineer from Kathmandu. BE Computer Engineering student at NCIT exploring penetration testing, malware and AI-assisted development.";

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "About", description, type: "profile" },
};

const focus = [
  "Malware analysis",
  "Reverse engineering",
  "Penetration testing",
  "Low-level systems",
  "AI-assisted development",
];

const now = [
  { label: "Studying", value: "BE Computer Engineering at NCIT College, Nepal" },
  { label: "Building", value: "Security tooling and AI-assisted prototypes" },
  { label: "Hunting", value: "Bug bounties — web apps, auth flows and access control" },
  { label: "Learning", value: "Reverse engineering, malware analysis and exploit development" },
];

const timeline = [
  { year: "2024", title: "Class 10", body: "Finished class 10 with a 3.73 GPA." },
  { year: "2024", title: "First lines of code", body: "Touched code for the first time. Wrote things that worked, then learned to break them properly." },
  { year: "2025", title: "AI-assisted building", body: "Began shipping full-stack web and software projects with AI in the loop — building fast, reviewing harder, trusting nothing blindly." },
  { year: "2025", title: "Bug hunting", body: "Started bug bounty hunting full-throttle: web apps, auth flows, the usual suspects. Reports became my favourite kind of homework." },
  { year: "2026", title: "Class 12 & college", body: "Finished class 12 with a 3.78 GPA — then straight into the BE Computer Engineering program at NCIT, Kathmandu." },
  { year: "2026", title: "Low-level, seriously", body: "Reverse engineering, malware analysis and assembly — going one layer below the abstraction and writing up everything I find." },
];


export default async function AboutPage() {
  const settings = await getSettings();
  const name = site.name.split(" ")[0];

  return (
    <>
      <header className={styles.masthead}>
        <div className={styles.inner}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span aria-hidden="true">›</span>
            <span aria-current="page">About</span>
          </nav>

          <p className={styles.kicker}>About</p>
          <h1 className={styles.title}>Cybersecurity enthusiast. Low-level hacker. Compulsive note-taker.</h1>
          <p className={styles.lede}>
            I&apos;m {name}, 18, from {settings.identity.location}. I spend most of my time around cybersecurity —
            reverse engineering binaries, studying malware, penetration testing web applications, and going one layer
            below the abstraction. I also build with AI in the loop, using it to prototype tools and move faster
            without switching off my brain. I study Computer Engineering (BE CE) at NCIT College, Nepal, and this site
            is where the breaking, building and documenting meet.
          </p>

          <ul className={styles.focus} aria-label="Areas of focus">
            {focus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <blockquote className={styles.quote}>
            &ldquo;The best way to understand a system is to break it, read the pieces, and write down what you
            learned.&rdquo;
          </blockquote>

          <div className={styles.actions}>
            <a href={`mailto:${settings.identity.email}`} className="btn btn-primary">Email me</a>
            <Link href="/blog" className="btn btn-outline">Read the write-ups</Link>
          </div>
        </div>
      </header>

      <div className={styles.inner}>
        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.section} aria-labelledby="story-heading">
              <h2 id="story-heading" className={styles.sectionTitle}>Why one place</h2>
              <div className={styles.prose}>
                <p>
                  I&apos;m a cybersecurity enthusiast with a bad habit of asking what sits underneath the abstraction.
                  Malware, reverse engineering, penetration testing, low-level systems — the work changes, but the
                  method is the same: take the thing apart, find the assumptions holding it together, and document the
                  path back.
                </p>
                <p>
                  AI-assisted software development sits on the other side of that loop. I use it to build tools,
                  prototypes and small pieces of infrastructure, then verify the output like any other untrusted input.
                  Most posts here are work notes — reverse-engineering logs, penetration-testing findings, malware
                  notes, tooling experiments, and the occasional detour into college, books and the trail.
                </p>
              </div>
            </section>

            <section className={styles.section} aria-labelledby="now-heading">
              <h2 id="now-heading" className={styles.sectionTitle}>Now</h2>
              <dl className={styles.now}>
                {now.map((item) => (
                  <div key={item.label} className={styles.nowRow}>
                    <dt className={styles.nowLabel}>{item.label}</dt>
                    <dd className={styles.nowValue}>{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.foot}>Updated October 2026</p>
            </section>

            <section className={styles.section} aria-labelledby="timeline-heading">
              <h2 id="timeline-heading" className={styles.sectionTitle}>A short timeline</h2>
              <ol className={styles.timeline}>
                {timeline.map((item) => (
                  <li key={item.year}>
                    <span className={styles.year}>{item.year}</span>
                    <div className={styles.timelineBody}>
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        </div>
      </div>
      {settings.toggles.contactForm ? <ContactForm /> : null}
    </>
  );
}
