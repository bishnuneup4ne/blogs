// SSRF guard: validate user-supplied URLs before fetching them.
// Blocks non-http(s) schemes and private / reserved / link-local / metadata addresses.

function ipv4Blocks(host: string): boolean {
  const parts = host.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false; // not IPv4 — treat as hostname
  }
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  if (a === 169 && b === 254) return true; // link-local (cloud metadata: 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0) return true; // 192.0.0.0/24, 192.0.2.0/24
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
  if (a === 203 && b === 0 && parts[2] === 113) return true;
  if (a >= 224) return true; // multicast (224/4) + reserved (240/4)
  return false;
}

function ipv6Blocked(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h.includes(".")) {
    // IPv4-mapped / embedded, e.g. ::ffff:127.0.0.1
    const v4 = h.match(/(\d{1,3}\.){3}\d{1,3}$/);
    if (v4) return ipv4Blocks(v4[0]);
  }
  if (h === "::" || h === "::1") return true;
  const firstGroup = Number.parseInt(h.split(":")[0] || "0", 16);
  if (!Number.isNaN(firstGroup)) {
    if ((firstGroup & 0xfe00) === 0xfc00) return true; // fc00::/7 ULA
    if ((firstGroup & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if (firstGroup >= 0xff00) return true; // multicast
    if (firstGroup === 0x2001 && h.startsWith("2001:db8")) return true; // doc
  }
  if (h.startsWith("64:ff9b")) return true; // NAT64
  return false;
}

const BLOCKED_HOST_SUFFIXES = [".local", ".internal", ".localhost", ".home.arpa", ".onion"];

export function safeUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;

  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "0.0.0.0") return null;
  if (BLOCKED_HOST_SUFFIXES.some((s) => host === s.slice(1) || host.endsWith(s))) return null;

  // Bracketed form is IPv6
  if (url.hostname.startsWith("[")) {
    return ipv6Blocked(url.hostname) ? null : url;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return ipv4Blocks(host) ? null : url;
  }
  if (host.includes(":")) {
    return ipv6Blocked(host) ? null : url;
  }
  return url;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  headers?: Record<string, string>;
}

// Fetch with private-address validation on every redirect hop.
export async function safeFetch(rawUrl: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 8000, maxRedirects = 3, headers } = opts;
  let current = safeUrl(rawUrl);
  if (!current) throw new Error("URL rejected");

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        signal: controller.signal,
        redirect: "manual",
        headers,
      });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location || hop === maxRedirects) throw new Error("Too many or missing redirects");
      const next = safeUrl(new URL(location, current).toString());
      if (!next) throw new Error("Redirect target rejected");
      current = next;
      continue;
    }
    return res;
  }
  throw new Error("Redirect limit exceeded");
}
