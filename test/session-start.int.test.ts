/**
 * T1.3: `POST /api/session/start` against a real local D1 and KV, with the captcha stubbed.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { BROWSER_ID_COOKIE } from "../app/lib/browser-id";
import { hashIp } from "../app/lib/ip";
import { guardTestStart, setPaused } from "../app/lib/limits";
import { startSession, type StartResponse } from "../app/lib/session-start";
import type { CaptchaResult } from "../app/lib/turnstile";
import { applyMigrations, count, createTestDatabase, type TestD1, type TestKV } from "./d1";

let db: TestD1;
let kv: TestKV;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, kv, dispose } = await createTestDatabase());
  await applyMigrations(db);
});

afterEach(async () => {
  await dispose();
});

const NOW = new Date("2026-11-05T12:00:00Z");
const CONFIG = {
  turnstileSecretKey: "secret",
  ipHashSalt: "salt",
  retentionDays: 90,
  dailySttMinutesCap: 80,
};
const VALID = { name: "Ana Silva", consent: true, turnstileToken: "token" };

function start(
  body: unknown,
  options: { cookie?: string; ip?: string; captcha?: CaptchaResult; tokens?: string[] } = {},
) {
  const headers: Record<string, string> = { "cf-connecting-ip": options.ip ?? "203.0.113.7" };
  if (options.cookie) headers.cookie = options.cookie;
  return startSession(body, {
    db,
    kv,
    request: new Request("https://read-ai.example/api/session/start", { method: "POST", headers }),
    config: CONFIG,
    now: NOW,
    verifyCaptcha: async (token) => {
      options.tokens?.push(token);
      return options.captcha ?? { ok: true };
    },
  });
}

async function errorOf(response: Response) {
  const body = (await response.json()) as {
    error: { code: string; message: string; retryable: boolean; fields?: Record<string, string> };
  };
  return { status: response.status, ...body.error };
}

const cookieFrom = (response: Response) =>
  response.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${BROWSER_ID_COOKIE}=`))
    ?.split(";")[0];

describe("refusals", () => {
  it("missing consent → 403 CONSENT_REQUIRED, before the captcha is checked", async () => {
    const tokens: string[] = [];
    for (const consent of [undefined, false, "true"]) {
      const error = await errorOf(await start({ ...VALID, consent }, { tokens }));
      expect(error).toMatchObject({ status: 403, code: "CONSENT_REQUIRED" });
      expect(error.fields).toHaveProperty("consent");
    }
    expect(tokens).toEqual([]);
    expect(await count(db, "participants")).toBe(0);
  });

  it("bad captcha → 403 CAPTCHA_FAILED, not retryable", async () => {
    const error = await errorOf(await start(VALID, { captcha: { ok: false, reason: "invalid" } }));
    expect(error).toMatchObject({ status: 403, code: "CAPTCHA_FAILED", retryable: false });
    expect(await count(db, "participants")).toBe(0);
  });

  it("missing captcha token → 403 CAPTCHA_FAILED without calling Turnstile", async () => {
    const tokens: string[] = [];
    const error = await errorOf(await start({ ...VALID, turnstileToken: "" }, { tokens }));
    expect(error).toMatchObject({ status: 403, code: "CAPTCHA_FAILED" });
    expect(tokens).toEqual([]);
  });

  it("Turnstile unreachable → 403 CAPTCHA_FAILED, retryable (fails closed)", async () => {
    const error = await errorOf(
      await start(VALID, { captcha: { ok: false, reason: "unavailable" } }),
    );
    expect(error).toMatchObject({ status: 403, code: "CAPTCHA_FAILED", retryable: true });
  });

  it("invalid name and group code → 400 VALIDATION_FAILED with both fields", async () => {
    const error = await errorOf(await start({ ...VALID, name: "<script>", groupCode: "a b" }));
    expect(error).toMatchObject({ status: 400, code: "VALIDATION_FAILED" });
    expect(Object.keys(error.fields ?? {})).toEqual(["name", "groupCode"]);
  });

  it("never uses up a test, and is refused once the IP has used its 3 tests", async () => {
    for (let i = 0; i < 4; i++) {
      expect((await start({ ...VALID, name: `Ana ${"BCDE"[i]}` })).status).toBe(201);
    }
    const ipHash = await hashIp("203.0.113.7", CONFIG.ipHashSalt);
    for (let i = 0; i < 3; i++) {
      await guardTestStart({ db, kv, ipHash, dailySttMinutesCap: 80, now: NOW });
    }
    expect(await errorOf(await start(VALID))).toMatchObject({ status: 429, code: "RATE_LIMITED" });
  });

  it("kill switch on → 503 DEMO_PAUSED and no participant", async () => {
    await setPaused(db, NOW, true);
    expect(await errorOf(await start(VALID))).toMatchObject({ status: 503, code: "DEMO_PAUSED" });
    expect(await count(db, "participants")).toBe(0);
  });
});

describe("creating a participant", () => {
  it("stores the display name, a code, consent time, hashed IP and delete date", async () => {
    const response = await start({ ...VALID, groupCode: " turma-3b " });
    expect(response.status).toBe(201);
    const body = (await response.json()) as StartResponse;
    expect(body.participant.displayName).toBe("Ana S.");
    expect(body.participant.code).toMatch(/^[2-9A-HJKMNP-Z]{4}$/);
    expect(body).toMatchObject({ groupCode: "TURMA-3B", resumed: false });

    const row = await db
      .prepare("SELECT * FROM participants WHERE id = ?1")
      .bind(body.participant.id)
      .first<Record<string, unknown>>();
    expect(row).toMatchObject({
      display_name: "Ana S.",
      code: body.participant.code,
      browser_id: body.browserId,
      consent_at: NOW.getTime(),
      delete_after: NOW.getTime() + 90 * 86_400_000,
    });
    expect(row?.ip_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain("Silva");
    expect(JSON.stringify(row)).not.toContain("203.0.113.7");
  });

  it("sets a host-only browser id cookie and the group code cookie", async () => {
    const response = await start({ ...VALID, groupCode: "G1" });
    const cookies = response.headers.getSetCookie();
    expect(cookies).toHaveLength(2);
    expect(cookies[0]).toMatch(
      /^browser_id=[0-9a-f-]{36}; Path=\/; Max-Age=7776000; HttpOnly; SameSite=Lax; Secure$/,
    );
    expect(cookies[1]).toBe("group_code=G1; Path=/; HttpOnly; SameSite=Lax; Secure");
    expect(cookies.join()).not.toMatch(/Domain=/i);
  });

  it("gives two people with the same display name different codes", async () => {
    const a = (await (await start(VALID, { ip: "198.51.100.1" })).json()) as StartResponse;
    const b = (await (
      await start({ ...VALID, name: "Ana Souza" }, { ip: "198.51.100.2" })
    ).json()) as StartResponse;
    expect(b.participant.displayName).toBe(a.participant.displayName);
    expect(b.participant.code).not.toBe(a.participant.code);
  });
});

describe("returning browser", () => {
  it("two requests with the same browser_id return the same participant", async () => {
    const first = await start(VALID);
    const cookie = cookieFrom(first);
    const created = (await first.json()) as StartResponse;

    const again = await start({ ...VALID, name: "Someone Else" }, { cookie });
    expect(again.status).toBe(200);
    const resumed = (await again.json()) as StartResponse;
    expect(resumed).toMatchObject({
      participant: created.participant,
      browserId: created.browserId,
      resumed: true,
    });
    expect(await count(db, "participants")).toBe(1);
  });

  it("resumes from the localStorage copy when the cookie is gone, without needing the name", async () => {
    const created = (await (await start(VALID)).json()) as StartResponse;
    const response = await start({
      consent: true,
      turnstileToken: "token",
      browserId: created.browserId,
    });
    expect(((await response.json()) as StartResponse).participant).toEqual(created.participant);
  });

  it("an unknown or expired browser id starts a new participant", async () => {
    const created = (await (await start(VALID)).json()) as StartResponse;
    await db
      .prepare("UPDATE participants SET delete_after = ?1")
      .bind(NOW.getTime() - 1)
      .run();
    const response = await start(VALID, { cookie: `${BROWSER_ID_COOKIE}=${created.browserId}` });
    expect(response.status).toBe(201);
    expect(await count(db, "participants")).toBe(2);
  });

  it("still needs consent and the captcha", async () => {
    const cookie = cookieFrom(await start(VALID));
    expect((await errorOf(await start({ ...VALID, consent: false }, { cookie }))).code).toBe(
      "CONSENT_REQUIRED",
    );
    const bad = await start(VALID, { cookie, captcha: { ok: false, reason: "invalid" } });
    expect((await errorOf(bad)).code).toBe("CAPTCHA_FAILED");
  });
});
