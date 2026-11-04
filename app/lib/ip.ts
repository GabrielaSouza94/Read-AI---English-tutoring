/**
 * Client IP handling (TR-14, TR-15). The raw IP is used only within a request; anything stored or
 * used as a counter key is the salted hash. Runtime-neutral (Web Crypto exists in Node and Workers).
 */

/** The client IP Cloudflare saw, or "unknown" (local tools that send no header). */
export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

/** Salted SHA-256 of the IP, as 64 hex characters. The salt is the IP_HASH_SALT secret. */
export async function hashIp(ip: string, salt: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${ip}`));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
