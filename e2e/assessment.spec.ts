import { expect, test } from "@playwright/test";

import { passMicCheck, recordAndSubmit, startAsParticipant } from "./helpers";

// Local and CI run with STUB_SCORER=true, so every attempt passes (Gate A). The recordings come
// from the fake microphones, which WebKit in Playwright does not have.
test.describe("progressive steps", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit in Playwright cannot capture audio",
  );

  test("Gate A: test 1 runs through its 7 steps to the end", async ({ page }) => {
    test.setTimeout(90_000);
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    await expect(page.getByRole("main")).toContainText("7 steps in all");
    await passMicCheck(page);
    await page.getByRole("button", { name: "Begin the test" }).click();

    const labels = [
      "Read the first sentence",
      "Read sentences 1 to 2",
      "Read sentences 1 to 3",
      "Read sentences 1 to 4",
      "Read sentences 1 to 5",
      "Read the whole story (1 of 2)",
      "Read the whole story (2 of 2)",
    ];
    for (const [i, label] of labels.entries()) {
      await expect(page.getByText(`Step ${i + 1} of 7`)).toBeVisible();
      await expect(page.getByRole("heading", { name: label })).toBeVisible();
      await expect(page.getByText("Attempt 1 of 3")).toBeVisible();
      await recordAndSubmit(page);
      if (i < labels.length - 1) {
        await expect(page.getByRole("status").first()).toHaveText(
          "Well done! On to the next step.",
        );
      }
    }
    await expect(page.getByRole("heading", { name: "You finished the test" })).toBeVisible();
    await page.getByRole("link", { name: "Choose another test" }).click();
    await expect(page).toHaveURL(/\/tests$/);
  });

  test("a reload on step 3 resumes step 3", async ({ page }) => {
    test.setTimeout(60_000);
    await startAsParticipant(page);
    await page.goto("/assessment?testId=1");
    await passMicCheck(page);
    await page.getByRole("button", { name: "Begin the test" }).click();
    for (let step = 1; step <= 2; step++) {
      await expect(page.getByText(`Step ${step} of 7`)).toBeVisible();
      await recordAndSubmit(page);
    }
    await expect(page.getByText("Step 3 of 7")).toBeVisible();
    const text = await page.getByTestId("step-text").textContent();

    await page.reload();
    await expect(page.getByText("Step 3 of 7")).toBeVisible();
    await expect(page.getByTestId("step-text")).toHaveText(text ?? "");
    await expect(page.getByRole("heading", { name: "Read sentences 1 to 3" })).toBeVisible();
    // The microphone check passed earlier in this tab, so the recorder is ready.
    await expect(page.getByRole("button", { name: "Record", exact: true })).toBeVisible();
  });
});

test("test 4 has 9 steps", async ({ page }) => {
  await startAsParticipant(page);
  await page.goto("/assessment?testId=4");
  await expect(page.getByRole("main")).toContainText("The story has 7 sentences");
  await expect(page.getByRole("main")).toContainText("9 steps in all");
  await expect(page.getByRole("main")).toContainText("up to 2 tries per step");
});
