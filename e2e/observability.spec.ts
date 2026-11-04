import { expect, test } from "@playwright/test";

test("every response carries a request id", async ({ request }) => {
  const response = await request.get("/");
  expect(response.headers()["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
});

test("an unhandled API error returns S-1 JSON with the request id", async ({ request }) => {
  const response = await request.get("/api/debug/error");
  expect(response.status()).toBe(500);
  const body = await response.json();
  expect(body.error).toMatchObject({ code: "INTERNAL", retryable: true });
  expect(body.error.requestId).toBe(response.headers()["x-request-id"]);
});
