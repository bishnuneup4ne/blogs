export function formatDate(iso: string, opts: { long?: boolean } = {}): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: opts.long ? "long" : "short",
    year: opts.long ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function shortDate(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}

export function relativeDate(iso: string): string {
  const date = new Date(iso);
  if (!iso || Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 0) return formatDate(iso);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diffSec < minute) return "just now";
  if (diffSec < hour) {
    const m = Math.floor(diffSec / minute);
    return m === 1 ? "1 minute ago" : `${m} minutes ago`;
  }
  if (diffSec < day) {
    const h = Math.floor(diffSec / hour);
    return h === 1 ? "1 hour ago" : `${h} hours ago`;
  }
  if (diffSec < day * 7) {
    const d = Math.floor(diffSec / day);
    return d === 1 ? "yesterday" : `${d} days ago`;
  }
  return formatDate(iso);
}
