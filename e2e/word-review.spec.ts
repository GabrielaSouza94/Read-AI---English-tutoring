import { expect, test } from "@playwright/test";

import { passMicCheck, recordAndSubmit, startAsParticipant } from "./helpers";

// The stub scorer always passes, so the failed attempt is mocked in the browser. Recording needs
// the fake microphones, which WebKit in Playwright does not have.
test.describe("word review after a failed attempt", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit in Playwright cannot capture audio",
  );

  test("Record stays disabled until all 3 highlighted words are reviewed", async ({ page }) => {
    test.setTimeout(60_000);
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    await passMicCheck(page);
    await page.getByRole("button", { name: "Begin the test" }).click();
    await expect(page.getByText("Step 1 of 7")).toBeVisible();

    // Sentence 1: "Maria takes the bus to work every morning."
    await page.route("**/api/attempts", (route) =>
      route.fulfill({
        json: {
          outcome: "retry",
          passed: false,
          message: "Not quite yet. Look at the highlighted words and try again.",
          stepNumber: 1,
          attempt: 1,
          done: false,
          highlightedWords: ["Maria", "bus", "morning"],
        },
      }),
    );
    await recordAndSubmit(page);

    await expect(page.getByText("3 words to review")).toBeVisible();
    await expect(page.getByRole("button", { name: "Play instructions again" })).toBeVisible();
    const record = page.getByRole("button", { name: "Record", exact: true });
    await expect(record).toBeDisabled();
    await expect(record).toHaveAccessibleDescription(
      "Review every highlighted word before you record again.",
    );

    const words = ["Maria", "bus", "morning."];
    for (const word of words) {
      await expect(page.getByRole("button", { name: word, exact: true })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }

    // Mouse for the first two, keyboard for the last.
    await page.getByRole("button", { name: "Maria", exact: true }).click();
    await expect(page.getByText("2 of 3 words left to review")).toBeVisible();
    await page.getByRole("button", { name: "bus", exact: true }).click();
    await expect(record).toBeDisabled();
    await page.getByRole("button", { name: "morning.", exact: true }).focus();
    await page.keyboard.press("Space");

    await expect(page.getByText("All words reviewed. You can record again.")).toBeVisible();
    for (const word of words) {
      await expect(page.getByRole("button", { name: word, exact: true })).toHaveAttribute(
        "aria-pressed",
        "true",
      );
    }
    await expect(record).toBeEnabled();

    // Un-marking a word disables Record again.
    await page.getByRole("button", { name: "bus", exact: true }).click();
    await expect(record).toBeDisabled();
  });
});

test("the instruction audio file is served", async ({ request }) => {
  const response = await request.get("/audio/word-review-instruction.mp3");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("audio/mpeg");
  expect((await response.body()).length).toBeGreaterThan(10_000);
});
