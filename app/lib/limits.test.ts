import { describe, expect, it } from "vitest";

import type { KVLike } from "./alerts";
import { clientIp, hashIp } from "./ip";
import {
  API_RATE_LIMIT,
  checkApiRateLimit,
  consumeDailyLimit,
  counterKey,
  DAILY_LIMITS,
  COUNTER_TTL_SECONDS,
} from "./limits";

function memoryKv() {
  const store = new Map<string, string>();
  const ttls = new Map<string, number | undefined>();
  const kv: KVLike = {
    get: (key) => Promise.resolve(store.get(key) ?? null),
    put: (key, value, options) => {
      store.set(key, value);
      ttls.set(key, options?.expirationTtl);
      return Promise.resolve();
    },
  };
  return { kv, store, ttls };
}

describe("counterKey", () => {
  it("uses the UTC date, so the count resets at midnight UTC", () => {
    // 22:30 in São Paulo (UTC-3) is already the next day in UTC.
    expect(counterKey("tests", "abc", new Date("2026-11-04T22:30:00-03:00"))).toBe(
      "tests:abc:2026-11-05",
    );
    expect(counterKey("reviews", "abc", new Date("2026-11-04T23:59:59Z"))).toBe(
      "reviews:abc:2026-11-04",
    );
  });
});

describe("consumeDailyLimit", () => {
  const day = new Date("2026-11-04T10:00:00Z");

  it("allows up to the limit, then refuses without counting further", async () => {
    const { kv, store } = memoryKv();
    const results = [];
    for (let i = 0; i < DAILY_LIMITS.tests + 1; i++) {
      results.push(await consumeDailyLimit(kv, "tests", "ip1", day));
    }
    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results.at(-1)).toMatchObject({ used: 3, limit: 3 });
    expect(store.get("tests:ip1:2026-11-04")).toBe("3");
  });

  it("starts again on the next UTC day and keeps IPs apart", async () => {
    const { kv } = memoryKv();
    for (let i = 0; i < 3; i++) await consumeDailyLimit(kv, "tests", "ip1", day);
    expect((await consumeDailyLimit(kv, "tests", "ip1", day)).allowed).toBe(false);
    expect((await consumeDailyLimit(kv, "tests", "ip2", day)).allowed).toBe(true);
    const nextDay = new Date("2026-11-05T00:00:01Z");
    expect(await consumeDailyLimit(kv, "tests", "ip1", nextDay)).toMatchObject({
      allowed: true,
      used: 1,
    });
  });

  it("writes counters with a 24-hour TTL and allows 20 reviews", async () => {
    const { kv, ttls } = memoryKv();
    for (let i = 0; i < 20; i++) {
      expect((await consumeDailyLimit(kv, "reviews", "ip1", day)).allowed).toBe(true);
    }
    expect((await consumeDailyLimit(kv, "reviews", "ip1", day)).allowed).toBe(false);
    expect(ttls.get("reviews:ip1:2026-11-04")).toBe(COUNTER_TTL_SECONDS);
    expect(COUNTER_TTL_SECONDS).toBe(24 * 3600);
  });

  it("treats a corrupt counter as used up rather than unlimited", async () => {
    const { kv, store } = memoryKv();
    store.set("tests:ip1:2026-11-04", "garbage");
    expect((await consumeDailyLimit(kv, "tests", "ip1", day)).allowed).toBe(false);
  });
});

describe("checkApiRateLimit", () => {
  const url = (path: string) => new URL(`https://read-ai.example${path}`);
  const limiter = (success: boolean) => {
    const keys: string[] = [];
    return {
      keys,
      limit: ({ key }: { key: string }) => {
        keys.push(key);
        return Promise.resolve({ success });
      },
    };
  };

  it("refuses an API request over the limit with S-1 RATE_LIMITED", async () => {
    const response = await checkApiRateLimit(limiter(false), url("/api/health"), "1.2.3.4");
    expect(response?.status).toBe(429);
    expect(await response?.json()).toMatchObject({ error: { code: "RATE_LIMITED" } });
  });

  it("lets API requests under the limit through, keyed by client IP", async () => {
    const fake = limiter(true);
    expect(await checkApiRateLimit(fake, url("/api/health"), "1.2.3.4")).toBeNull();
    expect(fake.keys).toEqual(["1.2.3.4"]);
  });

  it("ignores pages, and works without a binding", async () => {
    const fake = limiter(false);
    expect(await checkApiRateLimit(fake, url("/privacy"), "1.2.3.4")).toBeNull();
    expect(fake.keys).toEqual([]);
    expect(await checkApiRateLimit(undefined, url("/api/health"), "1.2.3.4")).toBeNull();
  });

  it("is 60 requests a minute", () => {
    expect(API_RATE_LIMIT).toEqual({ limit: 60, periodSeconds: 60 });
  });
});

describe("ip", () => {
  it("reads the client IP from Cloudflare's header", () => {
    const request = new Request("https://x", { headers: { "cf-connecting-ip": "203.0.113.7" } });
    expect(clientIp(request)).toBe("203.0.113.7");
    expect(clientIp(new Request("https://x"))).toBe("unknown");
  });

  it("hashes with the salt: stable, salt-dependent, and not the IP itself", async () => {
    const a = await hashIp("203.0.113.7", "salt-1");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashIp("203.0.113.7", "salt-1")).toBe(a);
    expect(await hashIp("203.0.113.7", "salt-2")).not.toBe(a);
    expect(a).not.toContain("203");
  });
});
