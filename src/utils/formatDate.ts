const MONTHS_UPPER = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
] as const;

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

/** Stable calendar date (UTC) — same output on server and client. */
export function formatCalendarDate(date: string): string {
  const iso = date.includes("T") ? date : `${date}T12:00:00.000Z`;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return date;

  return `${MONTHS[target.getUTCMonth()]} ${target.getUTCDate()}, ${target.getUTCFullYear()}`;
}

/** e.g. APRIL 19, 2026 — stable on server and client */
export function formatListDateUpper(date: string): string {
  const iso = date.includes("T") ? date : `${date}T12:00:00.000Z`;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return date.toUpperCase();

  return `${MONTHS_UPPER[target.getUTCMonth()]} ${target.getUTCDate()}, ${target.getUTCFullYear()}`;
}

export function formatDate(date: string, includeRelative = false) {
  const iso = date.includes("T") ? date : `${date}T12:00:00.000Z`;
  const targetDate = new Date(iso);
  if (Number.isNaN(targetDate.getTime())) return date;

  const fullDate = formatCalendarDate(date);

  if (!includeRelative) {
    return fullDate;
  }

  const currentDate = new Date();
  const timeDifference = currentDate.getTime() - targetDate.getTime();
  const daysAgo = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
  const hoursAgo = Math.floor(timeDifference / (1000 * 60 * 60));
  const minutesAgo = Math.floor(timeDifference / (1000 * 60));

  let formattedRelative = "";
  if (daysAgo >= 365) {
    formattedRelative = `${Math.floor(daysAgo / 365)}y ago`;
  } else if (daysAgo >= 30) {
    formattedRelative = `${Math.floor(daysAgo / 30)}mo ago`;
  } else if (daysAgo > 0) {
    formattedRelative = `${daysAgo}d ago`;
  } else if (hoursAgo > 0) {
    formattedRelative = `${hoursAgo}h ago`;
  } else if (minutesAgo > 0) {
    formattedRelative = `${minutesAgo}m ago`;
  } else {
    formattedRelative = "just now";
  }

  return `${fullDate} (${formattedRelative})`;
}
