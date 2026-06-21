"use client";

import { useEffect, useState } from "react";
import { display } from "@/resources";
import { useConfig } from "@/components/ConfigProvider";
import styles from "./SiteMetaBar.module.scss";

function formatClock(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone,
  }).format(new Date());
}

function formatPlace(timeZone: string) {
  const part = timeZone.split("/").pop() ?? timeZone;
  return part.replace(/_/g, " ");
}

export function SiteMetaBar() {
  const { person } = useConfig();
  const [clock, setClock] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setClock(formatClock(person.location));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [person.location]);

  if (!display.location && !display.time) return null;

  return (
    <div className={styles.bar} aria-hidden={false} suppressHydrationWarning>
      {display.location ? (
        <span className={styles.location}>{formatPlace(person.location)}</span>
      ) : (
        <span />
      )}
      {display.time && clock ? (
        <time className={styles.time}>{clock}</time>
      ) : display.time ? (
        <time className={styles.time} aria-hidden>
          —
        </time>
      ) : null}
    </div>
  );
}
