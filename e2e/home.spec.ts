import { expect, test } from "@playwright/test";

test("landing page renders with the environment name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Read AI");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "For participants" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "For professors" })).toBeVisible();
  await expect(page.getByTestId("environment")).not.toBeEmpty();
});
