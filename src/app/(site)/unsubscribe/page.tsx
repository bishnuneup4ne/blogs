import type { Metadata } from "next";
import Link from "next/link";
import { UnsubscribeForm } from "@/components/site/UnsubscribeForm";
import styles from "./unsubscribe.module.scss";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Stop receiving the newsletter.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const email = typeof params.e === "string" ? params.e : "";
  const token = typeof params.t === "string" ? params.t : "";

  return (
    <div className={styles.page}>
      <p className={styles.kicker}>Newsletter</p>
      <h1 className={styles.title}>Leave the list?</h1>
      {email && token ? (
        <>
          <p className={styles.body}>
            This will stop the newsletter to <strong>{email}</strong>. No questions asked.
          </p>
          <UnsubscribeForm email={email} token={token} />
        </>
      ) : (
        <p className={styles.body}>
          Open the unsubscribe link from any newsletter email, or write to{" "}
          <Link href="/about">the contact page</Link> and I will remove you by hand.
        </p>
      )}
    </div>
  );
}
