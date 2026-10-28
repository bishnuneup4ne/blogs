"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./error.module.scss";
import { routes } from "@/lib/routes";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[site]", error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <p className={styles.code}>Something broke</p>
      <h1 className={styles.title}>That page hit a snag.</h1>
      <p className={styles.body}>
        The error has been logged. You can try again, or head back to the archive while it clears up.
      </p>
      <div className={styles.links}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href={routes.blog} className="btn btn-outline">All posts</Link>
        <Link href={routes.home} className="btn btn-outline">Home</Link>
      </div>
      {error.digest ? <p className={styles.digest}>Reference: {error.digest}</p> : null}
    </div>
  );
}
