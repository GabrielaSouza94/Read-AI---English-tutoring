import { expect, test } from "@playwright/test";

import { startAsParticipant } from "./helpers";

const TESTS = [
  { id: 1, cefr: "A2", title: "The Lost Umbrella", sentences: 5 },
  { id: 2, cefr: "B1", title: "A Market Morning", sentences: 6 },
  { id: 3, cefr: "B2", title: "The Night Shift", sentences: 6 },
  { id: 4, cefr: "C1", title: "The Mapmaker's Problem", sentences: 7 },
];

test("a direct visit without a session redirects to /start", async ({ page }) => {
  await page.goto("/tests");
  await expect(page).toHaveURL(/\/start$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Before you start");
});

test("the picker shows the 4 tests and each card opens the right test", async ({ page }) => {
  await startAsParticipant(page);
  await expect(page).toHaveTitle("Choose a test · Read AI");
  await expect(page.getByRole("main")).toContainText(/Ana S\. · [2-9A-HJKMNP-Z]{4}/);

  const cards = page.getByRole("main").getByRole("listitem");
  await expect(cards).toHaveCount(4);
  for (const [i, t] of TESTS.entries()) {
    const card = cards.nth(i);
    await expect(card.getByRole("heading")).toHaveText(t.title);
    await expect(card).toContainText(t.cefr);
    await expect(card).toContainText(`${t.sentences} sentences`);
    await expect(card).toContainText(/about \d minutes/);
  }

  for (const t of TESTS) {
    await page.goto("/tests");
    await page.getByRole("link", { name: `Start ${t.title}` }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === "/assessment" && url.searchParams.get("testId") === String(t.id),
    );
  }
});
