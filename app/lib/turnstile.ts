/**
 * Server-side Turnstile check (TR-03, TR-05). S-2: 5-second timeout, no retry, fail closed.
 * Cloudflare's test keys work locally and in CI: site key 1x00000000000000000000AA with secret
 * 1x0000000000000000000000000000000AA always passes; secret 2x0000000000000000000000000000000AA always fails.
 */
import type { Fetch } from "./http";

export const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_TIMEOUT_MS = 5000;

/** `unavailable`: Cloudflare could not be reached or answered with an error; the start is refused. */
export type CaptchaResult = { ok: true } | { ok: false; reason: "invalid" | "unavailable" };

export async function verifyTurnstile(
  secret: string,
  token: string,
  ip: string,
  fetchImpl: Fetch = fetch,
): Promise<CaptchaResult> {
  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (ip !== "unknown") form.set("remoteip", ip);

  let response: Response;
  try {
    response = await fetchImpl(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
  } catch {
    return { ok: false, reason: "unavailable" };
  }
  if (!response.ok) return { ok: false, reason: "unavailable" };
  const body = (await response.json().catch(() => null)) as { success?: unknown } | null;
  return body?.success === true ? { ok: true } : { ok: false, reason: "invalid" };
}
