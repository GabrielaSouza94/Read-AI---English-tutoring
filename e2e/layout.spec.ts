import { expect, test } from "@playwright/test";

const BANNER = "Public demo — names and scores are visible to everyone";

// /start and /portal are built later (T1.3, T4.1); the layout already wraps their not-found page.
for (const path of ["/", "/start", "/portal", "/privacy"]) {
  test(`header, demo banner and footer on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("note", { name: "Demo notice" })).toHaveText(BANNER);
    await expect(page.getByRole("banner").getByRole("link", { name: "Read AI" })).toBeVisible();
    await expect(
      page.getByRole("contentinfo").getByRole("link", { name: "Privacy" }),
    ).toBeVisible();
  });
}

test("the landing page links to the test and the portal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Read AI");
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(main.getByRole("link", { name: "Take a test" })).toHaveAttribute("href", "/start");
  await expect(main.getByRole("link", { name: "Open the portal" })).toHaveAttribute(
    "href",
    "/portal",
  );
});

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 1024, height: 768 },
]) {
  test(`landing page fits ${viewport.width} × ${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const overflow = await page.evaluate<number>(
      "document.documentElement.scrollWidth - document.documentElement.clientWidth",
    );
    expect(overflow).toBe(0);
    // Both calls to action are visible without scrolling.
    for (const name of ["Take a test", "Open the portal"]) {
      await expect(page.getByRole("main").getByRole("link", { name })).toBeInViewport();
    }
  });
}

// Safari and WebKit skip links on Tab unless "Press Tab to highlight each item" is on, and Playwright
// cannot turn it on. Chromium and Firefox cover keyboard access.
test.describe("keyboard", () => {
  test.skip(
    ({ browserName }) => browserName === "webkit",
    "WebKit does not tab to links by default",
  );

  test("everything on the landing page is reachable by keyboard", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeVisible();

    const reached = new Set<string>();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      reached.add(await page.evaluate<string>('document.activeElement?.textContent?.trim() ?? ""'));
    }
    for (const name of ["Read AI", "Take a test", "Open the portal", "Privacy"]) {
      expect(reached, `Tab reaches "${name}"`).toContain(name);
    }
  });

  test("skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
    await expect(page.getByRole("main")).toBeFocused();
  });
});
