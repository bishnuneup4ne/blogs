import Link from "next/link";
import styles from "./not-found.module.scss";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>This page took a wrong turn.</h1>
      <p className={styles.body}>
        The link may be old, or the post may have moved. The archive is a good place to start.
      </p>
      <div className={styles.links}>
        <Link href={routes.home} className="btn btn-primary">Home</Link>
        <Link href={routes.blog} className="btn btn-outline">All posts</Link>
      </div>
    </div>
  );
}
