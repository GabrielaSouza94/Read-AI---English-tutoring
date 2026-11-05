import { expect, test } from "@playwright/test";

// Every successful start uses one of the IP's 3 daily tests, and local KV keeps the count between
// runs. A fresh client IP per test keeps the suite repeatable; Cloudflare overwrites this header in
// staging and production. Only our own endpoint gets it: Turnstile's servers refuse requests that carry it.
test.beforeEach(async ({ page }) => {
  const octet = () => Math.floor(Math.random() * 254) + 1;
  const ip = `198.18.${octet()}.${octet()}`;
  await page.route("**/api/session/start", (route) =>
    route.continue({ headers: { ...route.request().headers(), "cf-connecting-ip": ip } }),
  );
});

// Turnstile test keys (local and CI): the widget passes on its own after a moment.
const continueButton = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Continue" });

test("the consent box links to the privacy notice", async ({ page, context }) => {
  await page.goto("/start");
  const [notice] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: /privacy notice/ }).click(),
  ]);
  await expect(notice).toHaveURL(/\/privacy$/);
  await expect(notice.getByRole("heading", { level: 1 })).toHaveText("Privacy notice");
});

test("full start flow lands on /tests, and the browser keeps its participant", async ({ page }) => {
  await page.goto("/start");
  await page.getByLabel("Name or nickname").fill("Ana Silva");
  await page.getByLabel("Group code").fill("e2e-1");
  await page.getByLabel(/I am 18 or older/).check();
  await expect(continueButton(page)).toBeEnabled({ timeout: 15_000 });
  await continueButton(page).click();
  await expect(page).toHaveURL(/\/tests$/);

  const stored = await page.evaluate<string | null>('localStorage.getItem("read-ai.browser-id")');
  expect(stored).toMatch(/^[0-9a-f-]{36}$/);
  const cookie = (await page.context().cookies()).find((c) => c.name === "browser_id");
  // SameSite and Secure are checked on the header in the unit tests; WebKit on Windows reports None.
  expect(cookie).toMatchObject({ value: stored, httpOnly: true });

  await page.goto("/start");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back");
  await expect(page.getByRole("main")).toContainText(/Ana S\. · [2-9A-HJKMNP-Z]{4}/);
  await expect(page.getByLabel("Name or nickname")).toHaveCount(0);
});

test("field errors are shown next to the field and announced", async ({ page }) => {
  await page.goto("/start");
  await page.getByLabel("Name or nickname").fill("A");
  await page.getByLabel(/I am 18 or older/).check();
  await expect(continueButton(page)).toBeEnabled({ timeout: 15_000 });
  await continueButton(page).click();

  await expect(page.getByRole("alert")).toHaveText("Please check the highlighted fields.");
  const name = page.getByLabel("Name or nickname");
  await expect(name).toHaveAttribute("aria-invalid", "true");
  await expect(name).toHaveAccessibleDescription(/Use at least 2 characters\./);
  await expect(name).toBeFocused();
});

test("without consent the start is refused", async ({ page }) => {
  await page.goto("/start");
  await page.getByLabel("Name or nickname").fill("Ana Silva");
  await expect(continueButton(page)).toBeEnabled({ timeout: 15_000 });
  await continueButton(page).click();
  await expect(page.getByRole("alert")).toContainText("Please confirm you are 18 or older");
  await expect(page.getByLabel(/I am 18 or older/)).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/start$/);
});
