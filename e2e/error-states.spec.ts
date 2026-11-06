/**
 * T2.6: every participant error state, forced with mocked API responses (403, 429, 503, 502,
 * network abort, 404). No raw error text may reach the page.
 */
import { expect, test, type Page } from "@playwright/test";

import {
  apiErrorJson,
  passMicCheck,
  recordAndSubmit,
  skipMicCheck,
  startAsParticipant,
  waitForCaptcha,
  withFreshClientIp,
} from "./helpers";

const RAW_ERROR = /Failed to fetch|NetworkError|Load failed|TypeError|undefined|\[object/;

async function expectNoRawError(page: Page) {
  await expect(page.getByRole("main")).not.toContainText(RAW_ERROR);
}

test.describe("before recording (all browsers)", () => {
  test("start page: a failed captcha (403) is explained", async ({ page }) => {
    await withFreshClientIp(page);
    await page.route("**/api/session/start", (route) =>
      route.fulfill(
        apiErrorJson(403, "CAPTCHA_FAILED", "The captcha check failed. Please try it again."),
      ),
    );
    await page.goto("/start");
    await page.getByLabel("Name or nickname").fill("Ana Silva");
    await page.getByLabel(/I am 18 or older/).check();
    await waitForCaptcha(page);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "The captcha check failed. Please try it again.",
    );
    await expect(page).toHaveURL(/\/start$/);
  });

  for (const [status, code, message] of [
    [429, "RATE_LIMITED", "You've reached today's 3 tests. Please come back tomorrow."],
    [503, "DEMO_PAUSED", "Demo paused until tomorrow: today's speech budget is used up."],
  ] as const) {
    test(`begin: ${status} ${code} shows "${message.split(":")[0].split(".")[0]}"`, async ({
      page,
    }) => {
      await skipMicCheck(page);
      await startAsParticipant(page);
      await page.route("**/api/assessment/begin", (route) =>
        route.fulfill(apiErrorJson(status, code, message)),
      );
      await page.goto("/assessment?testId=1");
      await page.getByRole("button", { name: "Begin the test" }).click();
      await expect(page.getByRole("alert")).toHaveText(message);
      await expect(page.getByText("Step 1 of 7")).toHaveCount(0);
    });
  }

  test("begin: a lost connection says so, without the browser's raw error", async ({ page }) => {
    await skipMicCheck(page);
    await startAsParticipant(page);
    await page.route("**/api/assessment/begin", (route) => route.abort("internetdisconnected"));
    await page.goto("/assessment?testId=1");
    await page.getByRole("button", { name: "Begin the test" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Connection lost. Check your internet connection, then try again.",
    );
    await expectNoRawError(page);
  });

  test("an unknown test (404) links back to the test list", async ({ page }) => {
    await startAsParticipant(page);
    const response = await page.goto("/assessment?testId=99");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Test not found");
    await page.getByRole("link", { name: "Choose a test" }).click();
    await expect(page).toHaveURL(/\/tests$/);
  });

  test("an unknown page links to the home page", async ({ page }) => {
    await page.goto("/no-such-page");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Page not found");
    await page.getByRole("link", { name: "Go to the home page" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("an unsupported browser is told up front, with the supported list", async ({ page }) => {
    await page.addInitScript({ content: "delete window.AudioWorkletNode;" });
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText("This browser cannot record audio.");
    await expect(alert).toContainText("Chrome, Edge, Firefox or Safari");
    await expect(page.getByRole("button", { name: "Check my microphone" })).toHaveCount(0);
  });
});

test.describe("sending a recording", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit in Playwright cannot capture audio",
  );

  async function onStepOne(page: Page) {
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    await passMicCheck(page);
    await page.getByRole("button", { name: "Begin the test" }).click();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
  }

  test("connection lost: the recording is kept and Send again works without re-recording", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await onStepOne(page);
    await page.route("**/api/attempts", (route) => route.abort("internetdisconnected"));
    await recordAndSubmit(page);

    await expect(page.getByRole("alert")).toHaveText(
      "Connection lost. Check your internet connection, then try again. Your recording is kept: press Send again.",
    );
    await expectNoRawError(page);
    await expect(page.getByLabel("Your recording")).toBeVisible();

    await page.unroute("**/api/attempts");
    await page.getByRole("button", { name: "Send again" }).click();
    await expect(page.getByText("Step 2 of 7")).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
  });

  test("scorer unavailable (502): the recording is kept for another try", async ({ page }) => {
    test.setTimeout(60_000);
    await onStepOne(page);
    await page.route("**/api/attempts", (route) =>
      route.fulfill(
        apiErrorJson(
          502,
          "PROVIDER_ERROR",
          "Scoring is not available yet. Please try again later.",
          true,
        ),
      ),
    );
    await recordAndSubmit(page);
    await expect(page.getByRole("alert")).toContainText("Scoring is not available yet.");
    await expect(page.getByRole("button", { name: "Send again" })).toBeVisible();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
  });

  test("one scorer down but the attempt saved: the participant is told", async ({ page }) => {
    test.setTimeout(60_000);
    await onStepOne(page);
    await page.route("**/api/attempts", (route) =>
      route.fulfill({
        json: {
          outcome: "passed",
          passed: true,
          message: "Well done! On to the next step.",
          stepNumber: 2,
          attempt: 0,
          done: false,
          highlightedWords: [],
          scorerUnavailable: true,
        },
      }),
    );
    await recordAndSubmit(page);
    await expect(page.getByRole("status").first()).toHaveText(
      "Well done! On to the next step. One scorer is unavailable; your attempt was saved.",
    );
  });

  test("session expired (404): the participant can restart the test", async ({ page }) => {
    test.setTimeout(60_000);
    await onStepOne(page);
    await page.route("**/api/attempts", (route) =>
      route.fulfill(
        apiErrorJson(404, "NOT_FOUND", "This test is not in progress. Please start it again."),
      ),
    );
    // What the server answers after an hour without activity: no test in progress.
    await recordAndSubmit(page);

    await expect(page.getByRole("heading", { name: "Your test session expired" })).toBeVisible();
    await page.unroute("**/api/attempts");
    await page.getByRole("button", { name: "Restart the test" }).click();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();
  });
});
