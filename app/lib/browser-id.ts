/**
 * The participant's browser id (TR-04): a random UUID kept in a host-only cookie (sent with every
 * request) and in localStorage (a copy that survives cleared cookies). Every read and write of it
 * goes through this module, so the own-domain move can hand it over in one place (T7.2).
 * Runtime-neutral: the server helpers take a Request, the browser helpers guard against no storage.
 */

export const BROWSER_ID_COOKIE = "browser_id";
const STORAGE_KEY = "read-ai.browser-id";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isBrowserId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function newBrowserId(): string {
  return crypto.randomUUID();
}

// --- Server ---

/** The browser id from the request's cookie, or null when absent or malformed. */
export function readBrowserIdCookie(request: Request): string | null {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === BROWSER_ID_COOKIE) {
      const value = rest.join("=");
      return isBrowserId(value) ? value : null;
    }
  }
  return null;
}

/** Set-Cookie value: host-only (no Domain), HttpOnly, Lax; Secure except on plain-http local dev. */
export function browserIdCookie(id: string, retentionDays: number, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${BROWSER_ID_COOKIE}=${id}; Path=/; Max-Age=${retentionDays * 86_400}; HttpOnly; SameSite=Lax${secure}`;
}

// --- Browser ---

/** The copy in localStorage, or null (none, malformed, or storage blocked). */
export function loadStoredBrowserId(): string | null {
  try {
    const value = globalThis.localStorage?.getItem(STORAGE_KEY);
    return isBrowserId(value) ? value : null;
  } catch {
    return null;
  }
}

export function storeBrowserId(id: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, id);
  } catch {
    // Private windows can refuse storage; the cookie still works.
  }
}
