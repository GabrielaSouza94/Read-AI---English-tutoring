import { describe, expect, it } from "vitest";

import type { Fetch } from "./http";
import { TURNSTILE_VERIFY_URL, verifyTurnstile } from "./turnstile";

function stub(respond: () => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fetchImpl: Fetch = async (url, init) => {
    calls.push({ url, init });
    return respond();
  };
  return { calls, fetchImpl };
}

describe("verifyTurnstile", () => {
  it("posts the secret, token and IP, and passes on success", async () => {
    const { calls, fetchImpl } = stub(() => Response.json({ success: true }));
    expect(await verifyTurnstile("secret", "token", "203.0.113.7", fetchImpl)).toEqual({
      ok: true,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(TURNSTILE_VERIFY_URL);
    const form = calls[0].init.body as FormData;
    expect(Object.fromEntries(form)).toEqual({
      secret: "secret",
      response: "token",
      remoteip: "203.0.113.7",
    });
    expect(calls[0].init.signal).toBeInstanceOf(AbortSignal);
  });

  it("leaves out an unknown IP", async () => {
    const { calls, fetchImpl } = stub(() => Response.json({ success: true }));
    await verifyTurnstile("secret", "token", "unknown", fetchImpl);
    expect((calls[0].init.body as FormData).has("remoteip")).toBe(false);
  });

  it("is invalid when Cloudflare says no", async () => {
    const { fetchImpl } = stub(() =>
      Response.json({ success: false, "error-codes": ["invalid-input-response"] }),
    );
    expect(await verifyTurnstile("secret", "token", "ip", fetchImpl)).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("fails closed without retrying on a network error or a 5xx", async () => {
    const network = stub(() => Promise.reject(new TypeError("fetch failed")));
    expect(await verifyTurnstile("s", "t", "ip", network.fetchImpl)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(network.calls).toHaveLength(1);

    const down = stub(() => new Response("oops", { status: 503 }));
    expect(await verifyTurnstile("s", "t", "ip", down.fetchImpl)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(down.calls).toHaveLength(1);
  });
});
