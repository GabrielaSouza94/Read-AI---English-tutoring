import { expect, test } from "@playwright/test";

test("hello page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Read AI");
  await expect(page.getByRole("heading", { name: "Read AI" })).toBeVisible();
  await expect(page.getByTestId("environment")).not.toBeEmpty();
});
