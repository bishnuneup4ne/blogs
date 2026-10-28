import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ContactForm } from "@/components/site/ContactForm";
import { ShareMenu } from "@/components/blog/ShareMenu";
import { getSettings } from "@/lib/settings";
import { getAllPosts } from "@/lib/data";
import { formatDate } from "@/lib/dates";
import { routes, url } from "@/lib/routes";
import styles from "./about.module.scss";

const description =
  "About Bishnu Neupane — cybersecurity enthusiast, low-level hacker and reverse engineer from Kathmandu. BE Computer Engineering student at NCIT exploring penetration testing, malware and AI-assisted development.";

export const metadata: Metadata = {
  title: "About",
  description,
  alternates: { canonical: "/about" },
  openGraph: { url: "/about", title: "About", description, type: "profile" },
};

const UPDATED_ISO = "2026-10-28";

export default async function AboutPage() {
  const [settings, posts] = await Promise.all([getSettings(), getAllPosts()]);
  const a = settings.about;
  const latest = [...posts]
    .sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime())
    .slice(0, 3);

  const words = [a.title, a.lede, a.quote, ...a.story].join(" ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));

  const updated = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(UPDATED_ISO));

  const shareUrl = url(routes.about);
  const mail = `mailto:${settings.identity.email}`;
  const outbound = settings.socials.filter((s) => !s.href.startsWith("mailto:"));
  const [lead, ...rest] = a.story;

  return (
    <>
      {/* ---------- Article hero ---------- */}
      <header className={styles.hero}>
        <div className={styles.grid}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href={routes.home}>Home</Link>
            <Chevron />
            <span aria-current="page">About</span>
          </nav>

          <h1 className={styles.title}>{a.title}</h1>

          <div className={styles.metaRow}>
            <p className={styles.date}>
              <time dateTime={UPDATED_ISO}>{updated}</time>
              <span aria-hidden="true" className={styles.divider}>
                |
              </span>
              <span>{minutes} min read</span>
            </p>
            <ShareMenu title="About" url={shareUrl} />
          </div>

          <p className={styles.abstract}>{a.lede}</p>

          <div className={styles.authors}>
            <div className={styles.author}>
              {a.imageUrl ? (
                <Image src={a.imageUrl} alt="" width={48} height={48} className={styles.authorAvatar} />
              ) : null}
              <div className={styles.authorInfo}>
                <p className={styles.authorName}>{settings.identity.authorName}</p>
                <p className={styles.authorTitle}>
                  {settings.identity.location} · BE Computer Engineering, NCIT
                </p>
              </div>
            </div>
          </div>
        </div>

        {a.imageUrl ? (
          <figure className={styles.media}>
            <div className={styles.mediaFrame}>
              <Image
                src={a.imageUrl}
                alt={a.imageAlt}
                fill
                priority
                sizes="(max-width: 1440px) 100vw, 1376px"
                className={styles.mediaImg}
              />
            </div>
          </figure>
        ) : null}

        <div className={styles.grid}>
          <div className={styles.heroActions}>
            <div className={styles.actionsInner}>
              <a href={mail} className={styles.cta}>
                <MailIcon />
                Get in touch
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Body ---------- */}
      <article className={styles.article}>
        <div className={styles.prose}>
          {lead || rest.length > 0 ? (
            <>
              <p>{lead ?? a.lede}</p>
              {rest.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </>
          ) : null}

          {a.now.length > 0 ? (
            <>
              <h2 id="now" className={styles.h2}>
                Right now
              </h2>
              <p>
                The short answer to “what are you working on?” — kept current, so nobody has to ask twice.
              </p>
              <ul className={styles.nowList}>
                {a.now.map((item) => (
                  <li key={item.label}>
                    <span className={styles.nowLabel}>{item.label}</span>
                    <span className={styles.nowValue}>{item.value}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.caption}>Last updated {a.updated}.</p>
            </>
          ) : null}

          {a.focus.length > 0 ? (
            <>
              <h2 id="focus" className={styles.h2}>
                What I work on
              </h2>
              <p>
                Five areas, one question asked at different depths: what is this system actually doing, and
                where does it assume something it shouldn’t?
              </p>
              <ol className={styles.disciplines}>
                {a.focus.map((item, i) => (
                  <li key={item}>
                    <span className={styles.disciplineIndex} aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className={styles.disciplineName}>{item}</span>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {a.timeline.length > 0 ? (
            <>
              <h2 id="timeline" className={styles.h2}>
                How it got here
              </h2>
              <p>
                A rough order of events, from a first line of code to reading memory by hand.
              </p>
              <ol className={styles.timeline}>
                {a.timeline.map((item, i) => (
                  <li key={`${item.year}-${i}`}>
                    <span className={styles.year}>{item.year}</span>
                    <div>
                      <h3 className={styles.h3}>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </>
          ) : null}

          {a.quote ? (
            <blockquote className={styles.quote}>
              <p>{a.quote}</p>
            </blockquote>
          ) : null}

          {latest.length > 0 ? (
            <>
              <h2 id="writing" className={styles.h2}>
                From the writing
              </h2>
              <ul className={styles.latest}>
                {latest.map((post) => (
                  <li key={post.slug}>
                    <Link href={routes.post(post.slug)} className={styles.latestRow}>
                      <span className={styles.latestTitle}>{post.title}</span>
                      <span className={styles.latestMeta}>
                        {formatDate(post.date)} · {post.readingMinutes} min read
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <div className={styles.postedIn}>
            <h3 className={styles.postedTitle}>Posted in:</h3>
            <ul>
              {outbound.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {s.label}
                  </a>
                </li>
              ))}
              <li>
                <a href={mail}>Email</a>
              </li>
              <li>
                <Link href={routes.blog}>Writing</Link>
              </li>
              <li>
                <Link href={routes.personal}>Personal</Link>
              </li>
            </ul>
          </div>
        </div>
      </article>

      {settings.toggles.contactForm ? <ContactForm /> : null}
    </>
  );
}

const Chevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);
