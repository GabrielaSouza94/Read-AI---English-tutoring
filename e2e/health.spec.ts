import { expect, test } from "@playwright/test";

test("health check reaches the database and storage", async ({ request }) => {
  const response = await request.get("/api/health");
  const report = await response.json();
  expect(report.checks.database).toBe("ok");
  expect(report.checks.storage).toBe("ok");
  // Secrets are not set in CI, so config may be incomplete; the status code must match it.
  expect(response.status()).toBe(report.status === "ok" ? 200 : 503);
});
