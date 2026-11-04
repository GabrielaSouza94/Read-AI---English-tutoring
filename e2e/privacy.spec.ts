import { expect, test } from "@playwright/test";

// The local vars in wrangler.jsonc (vite preview runs the local environment).
const CONTACT = "gabrielasouza94@gmail.com";

test("the footer link opens the privacy notice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }).click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page).toHaveTitle("Privacy notice · Read AI");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Privacy notice");
});

test("the notice names the controller, contact, retention and third parties", async ({ page }) => {
  await page.goto("/privacy");
  const main = page.getByRole("main");
  await expect(main).toContainText("Gabriela Souza");
  const emailLinks = main.getByRole("link", { name: CONTACT });
  await expect(emailLinks.first()).toBeVisible();
  for (const link of await emailLinks.all()) {
    await expect(link).toHaveAttribute("href", `mailto:${CONTACT}`);
  }
  await expect(main).toContainText("90 days");
  for (const party of ["Deepgram", "Microsoft Azure", "Google", "LangSmith", "Cloudflare"]) {
    await expect(main.getByRole("table")).toContainText(party);
  }
  await expect(main).toContainText("never stored");
  await expect(main.getByRole("heading", { name: "Deleting your data" })).toBeVisible();
});
