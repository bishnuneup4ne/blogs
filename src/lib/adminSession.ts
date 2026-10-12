// Signed admin session tokens (Web Crypto — safe for proxy/middleware and route handlers).
// Token format: <expiryUnixSec>.<hex HMAC-SHA256 signature>
// Secret is derived (HKDF-SHA256) from PAGE_ACCESS_PASSWORD, so the cookie can no
// longer be forged by setting an arbitrary value like "authenticated".

const COOKIE_NAME = "admin_auth";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days

function utf8(s: string): ArrayBuffer {
  const encoded = new TextEncoder().encode(s);
  const buf = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buf).set(encoded);
  return buf;
}

async function getHmacKey(): Promise<CryptoKey> {
  const password = process.env.PAGE_ACCESS_PASSWORD?.trim();
  if (!password) {
    throw new Error("PAGE_ACCESS_PASSWORD is not configured");
  }
  const baseKey = await crypto.subtle.importKey("raw", utf8(password), "HKDF", false, [
    "deriveBits",
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt: utf8("ynu-sec-admin-session-v1"), info: utf8("") },
    baseKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function bytesToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminToken(): Promise<string | null> {
  try {
    const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_SEC;
    const key = await getHmacKey();
    const sig = bytesToHex(await crypto.subtle.sign("HMAC", key, utf8(String(exp))));
    return `${exp}.${sig}`;
  } catch {
    return null;
  }
}

export async function verifyAdminToken(token: string | undefined | null): Promise<boolean> {
  if (!token || !token.includes(".")) return false;
  try {
    const [expStr, sig] = token.split(".");
    const exp = Number(expStr);
    if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
    const key = await getHmacKey();
    const expected = bytesToHex(await crypto.subtle.sign("HMAC", key, utf8(expStr)));
    if (expected.length !== sig.length) return false;
    // constant-time comparison
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

export { COOKIE_NAME as ADMIN_COOKIE_NAME };
