import { expect, test } from "@playwright/test";

import { withFreshClientIp, waitForCaptcha } from "./helpers";

test.beforeEach(async ({ page }) => {
  await withFreshClientIp(page);
});

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
  await waitForCaptcha(page);
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
  await waitForCaptcha(page);
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
  await waitForCaptcha(page);
  await continueButton(page).click();
  await expect(page.getByRole("alert")).toContainText("Please confirm you are 18 or older");
  await expect(page.getByLabel(/I am 18 or older/)).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/start$/);
});
