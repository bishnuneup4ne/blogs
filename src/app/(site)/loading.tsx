import styles from "./loading.module.scss";

export default function SiteLoading() {
  return (
    <div className={styles.page} role="status" aria-label="Loading page">
      <span className={styles.sr}>Loading…</span>
      <div className={styles.hero}>
        <span className={styles.media} />
        <div className={styles.copy}>
          <span className={`${styles.line} ${styles.short}`} />
          <span className={`${styles.line} ${styles.heading}`} />
          <span className={`${styles.line} ${styles.heading}`} />
          <span className={`${styles.line} ${styles.body}`} />
          <span className={`${styles.line} ${styles.body}`} />
        </div>
      </div>
      <div className={styles.grid}>
        {[0, 1, 2].map((item) => (
          <span key={item} className={styles.card} />
        ))}
      </div>
    </div>
  );
}
