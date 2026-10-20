// Signed, single-purpose unsubscribe tokens.
//
// Unsubscribe used to be `GET /api/unsubscribe?email=...`, which meant any
// crawler, link-prefetcher or <img src=...> could silently drop a subscriber,
// and anyone who could guess an address could unsubscribe them. Tokens are an
// HMAC over the normalized address, so the email never travels in a URL and a
// link cannot be forged or pointed at somebody else.

const TOKEN_TTL_SEC = 60 * 60 * 24 * 180; // 180 days — people reopen old emails
const SEPARATOR = ".";

function secret(): string {
  // Dedicated secret if provided; otherwise derive from the admin password so
  // the flow works out of the box without extra configuration.
  return (
    process.env.UNSUBSCRIBE_SECRET?.trim() ||
    process.env.PAGE_ACCESS_PASSWORD?.trim() ||
    ""
  );
}

function utf8(s: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buf).set(encoded);
  return buf;
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function normalizeEmail(raw: unknown): string {
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : "";
}

async function signature(email: string, exp: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", utf8(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toHex(await crypto.subtle.sign("HMAC", key, utf8(`${email}${SEPARATOR}${exp}`)));
}

// base64url keeps the payload free of the "." separator — email addresses
// routinely contain dots, so a percent-encoded address would break parsing.
function encodeEmail(email: string): string {
  const bytes = new TextEncoder().encode(email);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeEmail(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function createUnsubscribeToken(rawEmail: string): Promise<string | null> {
  const email = normalizeEmail(rawEmail);
  if (!email || !secret()) return null;
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC;
  return `${encodeEmail(email)}${SEPARATOR}${exp}${SEPARATOR}${await signature(email, exp)}`;
}

/** Returns the subscriber address, or null when the token is absent/forged/expired. */
export async function verifyUnsubscribeToken(
  token: string | null | undefined,
): Promise<string | null> {
  if (!token || !secret()) return null;

  const parts = token.split(SEPARATOR);
  if (parts.length !== 3) return null;

  const [encodedEmail, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;

  let email = "";
  try {
    email = normalizeEmail(decodeEmail(encodedEmail));
  } catch {
    return null;
  }
  if (!email) return null;

  const expected = await signature(email, exp);
  if (expected.length !== sig.length) return null;

  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }

  return diff === 0 ? email : null;
}
