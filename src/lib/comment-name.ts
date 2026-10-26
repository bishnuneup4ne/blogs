/** Shared comment-name rules: real names, not keyboard mashing. */

const NAME_RE = /^[\p{L}][\p{L}'’.\- ]{1,78}[\p{L}.']$/u;

export function validateName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (!name) return "Please add your real name.";
  const words = name.split(" ").filter(Boolean);
  if (words.length < 2) return "Use your full name (first and last), like “Bishnu Neupane”.";
  if (words.some((w) => !/^[\p{L}][\p{L}'’.\-]{1,}$/u.test(w))) return "Names can’t contain numbers or symbols.";
  if (!NAME_RE.test(name)) return "Use your real name — letters, spaces, apostrophes and dots only.";
  // "aaaa bbbb" / "asdf qwerty" style filler
  if (/(.)\1{2,}/.test(name)) return "That looks like keyboard mashing — please use your real name.";
  const letters = name.replace(/[^\p{L}]/gu, "").toLowerCase();
  const unique = new Set(letters).size;
  if (letters.length >= 6 && unique / letters.length < 0.45) return "That doesn’t look like a real name.";
  return null;
}
