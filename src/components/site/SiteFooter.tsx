import Link from "next/link";
import { SocialIcon } from "@/components/icons/Icons";
import type { SiteSettings } from "@/lib/settings";
import styles from "./SiteFooter.module.scss";

export function SiteFooter({ settings }: { settings: SiteSettings }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <ul className={styles.mainLinks}>
          {settings.footerLinks.map((link) => (
            <li key={link.href} className={styles.linksItem}>
              <Link href={link.href}>{link.label}</Link>
            </li>
          ))}
          {settings.footerLinks.some((link) => link.href === "/privacy") ? null : (
            <li className={styles.linksItem}>
              <Link href="/privacy">Privacy</Link>
            </li>
          )}
        </ul>

        <ul className={styles.socials}>
          {settings.socials.map((s) => (
            <li key={s.label}>
              <a href={s.href} target={s.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer noopener" aria-label={s.label}>
                <SocialIcon name={socialKey(s.label)} width={20} height={20} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}

function socialKey(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("git")) return "github";
  if (l.includes("thread")) return "threads";
  if (l.includes("linked")) return "linkedin";
  if (l.includes("x") || l.includes("twitter")) return "x";
  if (l.includes("insta")) return "instagram";
  if (l.includes("youtube")) return "youtube";
  if (l.includes("face")) return "facebook";
  return "email";
}
