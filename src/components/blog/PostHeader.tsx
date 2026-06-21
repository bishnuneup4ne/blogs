import Link from "next/link";
import { formatListDateUpper } from "@/utils/formatDate";
import styles from "./PostHeader.module.scss";

type PostHeaderProps = {
  title: string;
  date?: string;
  category?: string;
  summary?: string;
};

export function PostHeader({ title, date, category, summary }: PostHeaderProps) {
  const dateLabel = date ? formatListDateUpper(date) : "";

  return (
    <header className={styles.header}>
      <Link href="/blogs" className={styles.back}>
        ← Posts
      </Link>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.meta}>
        {dateLabel && <time dateTime={date}>{dateLabel}</time>}
        {dateLabel && category ? <span className={styles.dot}>·</span> : null}
        {category ? <span>{category}</span> : null}
      </p>
      {summary ? <p className={styles.summary}>{summary}</p> : null}
    </header>
  );
}
