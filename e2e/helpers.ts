import { expect, test, type Page } from "@playwright/test";

/**
 * Each test start uses one of the IP's 3 daily tests, and local KV keeps the count between runs.
 * A fresh client IP per test keeps the suite repeatable; Cloudflare overwrites this header in
 * staging and production. Only our own API gets it: Turnstile's servers refuse requests that carry it.
 */
export async function withFreshClientIp(page: Page): Promise<void> {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  const ip = `198.18.${octet()}.${octet()}`;
  const app = new URL(test.info().project.use.baseURL ?? "http://invalid").origin;
  const ownApi = (url: URL) => url.origin === app && url.pathname.startsWith("/api/");
  await page.route(ownApi, (route) =>
    route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": ip } }),
  );
}

/** Turnstile test keys (local and CI): the widget passes on its own after a moment. */
export async function waitForCaptcha(page: Page): Promise<void> {
  await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 15_000 });
}

/** Creates a participant through /start and waits for /tests. */
export async function startAsParticipant(page: Page, name = "Ana Silva"): Promise<void> {
  await withFreshClientIp(page);
  await page.goto("/start");
  await page.getByLabel("Name or nickname").fill(name);
  await page.getByLabel(/I am 18 or older/).check();
  await waitForCaptcha(page);
  await page.getByRole("button", { name: "Continue" }).click();
  // The first start after a build compiles the Worker and calls Turnstile, which can take a while.
  // If the start is refused, fail with the page's message rather than a bare URL mismatch.
  const refusal = page.getByRole("alert").filter({ hasText: /\S/ });
  const outcome = await Promise.race([
    page.waitForURL(/\/tests$/, { timeout: 20_000 }).then(() => null),
    refusal.waitFor({ timeout: 20_000 }).then(() => refusal.textContent()),
  ]);
  if (outcome !== null) throw new Error(`Start was refused: ${outcome}`);
}

/** Runs the microphone check (fake microphone in Chromium and Firefox) and waits for it to pass. */
export async function passMicCheck(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Check my microphone" }).click();
  // A passed check gives way to the next control: "Begin the test" or the recorder.
  await expect(page.getByRole("button", { name: /^(Begin the test|Record)$/ })).toBeVisible({
    timeout: 10_000,
  });
}

/** Records for about `ms` and sends the recording for the current step. */
export async function recordAndSubmit(page: Page, ms = 1200): Promise<void> {
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
  await page.waitForTimeout(ms);
  await page.getByRole("button", { name: "Stop" }).click();
  await page.getByRole("button", { name: "Use this recording" }).click();
}

/** Marks the microphone check as passed in this tab, so tests that do not record can go on. */
export async function skipMicCheck(page: Page): Promise<void> {
  await page.addInitScript({
    content: 'try { sessionStorage.setItem("read-ai.mic-check-passed", "1"); } catch {}',
  });
}

/** An S-1 error response for page.route. */
export function apiErrorJson(status: number, code: string, message: string, retryable = false) {
  return { status, json: { error: { code, message, retryable } } };
}
