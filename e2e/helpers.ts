import { expect, type Page } from "@playwright/test";

/**
 * Every successful start uses one of the IP's 3 daily tests, and local KV keeps the count between
 * runs. A fresh client IP per test keeps the suite repeatable; Cloudflare overwrites this header in
 * staging and production. Only our own endpoint gets it: Turnstile's servers refuse requests that carry it.
 */
export async function withFreshClientIp(page: Page): Promise<void> {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  const ip = `198.18.${octet()}.${octet()}`;
  await page.route("**/api/session/start", (route) =>
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
  await expect(page).toHaveURL(/\/tests$/);
}
