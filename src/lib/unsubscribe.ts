import "server-only";

import { env } from "@/lib/env";

function keyMaterial(): string {
  return env.adminPassword || "unsubscribe-disabled";
}

async function key(): Promise<CryptoKey> {
  const material = new TextEncoder().encode(`unsubscribe:${keyMaterial()}`);
  const digest = await crypto.subtle.digest("SHA-256", material);
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function unsubscribeToken(email: string): Promise<string> {
  if (!env.adminPassword) return "";
  const signature = await crypto.subtle.sign("HMAC", await key(), new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyUnsubscribeToken(email: string, token: string): Promise<boolean> {
  const expected = await unsubscribeToken(email);
  if (!expected || expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  return diff === 0;
}
