import Link from "next/link";
import { formatDate, relativeDate } from "@/lib/dates";
import styles from "./kit.module.scss";

function shortRelative(iso: string): string {
  const relative = relativeDate(iso);
  if (!relative) return "–";
  if (relative.includes(" minutes ago") || relative.includes(" hours ago")) return relative;
  if (relative === "just now" || relative === "yesterday" || relative.endsWith(" days ago")) return relative;
  return "–";
}

export function DateCell({ iso, size = "normal", label }: { iso: string; size?: "small" | "normal"; label?: string }) {
  const display = size === "small" ? shortRelative(iso) : relativeDate(iso) || formatDate(iso);
  return (
    <td className={size === "small" ? `${styles.dateCell} ${styles.dateSmall}` : styles.dateCell} data-label={label}>
      <time dateTime={iso}>
        <span>{display}</span>
      </time>
    </td>
  );
}

const Switch = ({ checked, onChange, "aria-label": ariaLabel }: { checked: boolean; onChange: (v: boolean) => void; "aria-label": string }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={ariaLabel}
    className={styles.switch}
    onClick={() => onChange(!checked)}
  />
);

export { Switch };


export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        <h1 className={styles.pageTitle}>{title}</h1>
        {description ? <p className={styles.pageDesc}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.pageActions}>{actions}</div> : null}
    </div>
  );
}

export type StatusTone = "green" | "blue" | "yellow" | "gray" | "red";

export function StatusChip({ status, tone }: { status: string; tone: StatusTone }) {
  return (
    <span className={`${styles.status} ${styles[`tone-${tone}`]}`}>
      <span className={styles.statusDot} />
      {status}
    </span>
  );
}

export function statusTone(status: string): StatusTone {
  switch (status.toLowerCase()) {
    case "published":
    case "live":
    case "subscribed":
      return "green";
    case "scheduled":
      return "blue";
    case "review":
    case "pending":
      return "yellow";
    case "draft":
      return "gray";
    default:
      return "red";
  }
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>;
}

export function CardHead({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={styles.cardHead}>
      <h2 className={styles.cardTitle}>{title}</h2>
      {action ? <div className={styles.cardAction}>{action}</div> : null}
    </div>
  );
}

export function Table({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={styles.tableWrap} tabIndex={0}>
      <table className={`${styles.table}${compact ? " " + styles.compact : ""}`}>{children}</table>
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  href,
}: {
  title: string;
  body: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className={styles.empty}>
      <div className={styles.emptyArt} aria-hidden="true">
        <svg viewBox="0 0 120 90" width="120" height="90">
          <path d="M18 62c-10-14 2-30 18-28 4-14 26-20 34-6 16-4 30 8 24 22 10 8 4 22-8 22H26c-8 0-14-4-16-10" fill="var(--blue-50)" />
          <rect x="34" y="30" width="48" height="34" rx="6" fill="var(--white)" stroke="var(--gray-200)" />
          <path d="M44 42h28M44 50h20" stroke="var(--gray-400)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>
      <p className={styles.emptyTitle}>{title}</p>
      <p className={styles.emptyBody}>{body}</p>
      {action && href ? (
        <Link href={href} className="btn btn-primary">
          {action}
        </Link>
      ) : null}
    </div>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className={styles.segmented} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={value === o.value ? styles.segActive : styles.seg}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {typeof o.count === "number" ? <span className={styles.segCount}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

