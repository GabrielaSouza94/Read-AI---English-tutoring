import { describe, expect, it } from "vitest";

import { alertNotifier, EmailError, sendEmail } from "./email";

const MESSAGE = { to: "owner@example.com", subject: "Test", text: "Hello" };

function fakeFetch(statuses: (number | "network")[]) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const status = statuses[calls.length - 1] ?? 200;
    if (status === "network") throw new TypeError("fetch failed");
    return new Response("{}", { status });
  };
  return { calls, fetchImpl };
}

describe("sendEmail", () => {
  it("posts the message to Resend with the API key", async () => {
    const { calls, fetchImpl } = fakeFetch([200]);
    await sendEmail("re-key", MESSAGE, { fetchImpl });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.resend.com/emails");
    expect(new Headers(calls[0].init.headers).get("authorization")).toBe("Bearer re-key");
    expect(JSON.parse(calls[0].init.body as string)).toMatchObject({
      to: ["owner@example.com"],
      subject: "Test",
      text: "Hello",
    });
  });

  it.each([500, 429, "network" as const])("retries once after %s", async (first) => {
    const { calls, fetchImpl } = fakeFetch([first, 200]);
    await sendEmail("re-key", MESSAGE, { fetchImpl, retryDelayMs: 0 });
    expect(calls).toHaveLength(2);
  });

  it("does not retry a rejected request (4xx)", async () => {
    const { calls, fetchImpl } = fakeFetch([422]);
    await expect(sendEmail("re-key", MESSAGE, { fetchImpl, retryDelayMs: 0 })).rejects.toThrow(
      EmailError,
    );
    expect(calls).toHaveLength(1);
  });

  it("gives up after the retry fails", async () => {
    const { calls, fetchImpl } = fakeFetch([503, 503]);
    await expect(sendEmail("re-key", MESSAGE, { fetchImpl, retryDelayMs: 0 })).rejects.toThrow(
      "Resend returned 503",
    );
    expect(calls).toHaveLength(2);
  });
});

describe("alertNotifier", () => {
  it("fails clearly, without sending, when the alert settings are missing", async () => {
    const notify = alertNotifier({}, "staging");
    await expect(notify({ subject: "x", text: "y" })).rejects.toThrow(
      "ALERT_EMAIL or RESEND_API_KEY is not set",
    );
  });
});
