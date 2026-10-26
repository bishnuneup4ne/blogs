export function formatDate(iso: string, opts: { long?: boolean } = {}): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: opts.long ? "long" : "short",
    year: opts.long ? undefined : "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function shortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(date);
}
