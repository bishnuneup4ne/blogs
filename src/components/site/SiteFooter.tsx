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
              <Link href={link.href}>
                {link.icon ? <SocialIcon name={link.icon} width={16} height={16} /> : null}
                {link.label}
              </Link>
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
                <SocialIcon name={s.icon || socialKey(`${s.label} ${s.href}`)} width={20} height={20} />
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.legalBar}>
        <p className={styles.legal}>
          Built and maintained by{" "}
          <a href="https://bishnuneupane13.com.np" target="_blank" rel="noreferrer noopener">
            Bishnu Neupane
          </a>{" "}
          &middot; bishnuneupane13.com.np
        </p>
      </div>
    </footer>
  );
}

function socialKey(haystack: string): string {
  const l = haystack.toLowerCase();
  if (l.includes("git")) return "github";
  if (l.includes("thread")) return "threads";
  if (l.includes("linked")) return "linkedin";
  if (l.includes("insta")) return "instagram";
  if (l.includes("youtube") || l.includes("youtu.be")) return "youtube";
  if (l.includes("face")) return "facebook";
  if (l.includes("twitter") || l.includes("x.com")) return "x";
  if (l.includes("mail") || l.includes("email")) return "email";
  return "email";
}
