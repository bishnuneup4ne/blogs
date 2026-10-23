/**
 * Shared pagination window helper.
 *
 * Rendering one button per page blows up the DOM once a list gets long
 * (hundreds of buttons). This keeps a small, sliding window of page numbers
 * around the current page.
 */
export function pageWindow(current: number, total: number, span = 5): number[] {
  if (total <= 0) return [];
  if (total <= span) return Array.from({ length: total }, (_, i) => i + 1);
  const size = Math.max(3, span);
  const start = Math.max(1, Math.min(current - Math.floor(size / 2), total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}
