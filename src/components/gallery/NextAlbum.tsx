import Link from "next/link";
import { ArrowRight, ChevronLeft } from "@/components/icons/Icons";
import type { Album } from "@/lib/types";
import styles from "./NextAlbum.module.scss";

export function AlbumNav({ prev, next }: { prev: Album | null; next: Album | null }) {
  if (!prev && !next) return null;

  return (
    <nav className={styles.bar} aria-label="Album navigation">
      {prev ? (
        <Link href={`/gallery/${prev.slug}`} className={`${styles.item} ${styles.itemPrev}`}>
          <span className={styles.chev} aria-hidden="true">
            <ChevronLeft width={18} height={18} />
          </span>
          <span className={styles.text}>
            <span className={styles.label}>Previous album</span>
            <span className={styles.title}>{prev.title}</span>
          </span>
        </Link>
      ) : (
        <span className={styles.spacer} aria-hidden="true" />
      )}

      {next ? (
        <Link href={`/gallery/${next.slug}`} className={styles.item}>
          <span className={styles.text}>
            <span className={styles.label}>Next album</span>
            <span className={styles.title}>{next.title}</span>
          </span>
          <span className={styles.chev} aria-hidden="true">
            <ArrowRight width={18} height={18} />
          </span>
        </Link>
      ) : (
        <span className={styles.spacer} aria-hidden="true" />
      )}
    </nav>
  );
}
