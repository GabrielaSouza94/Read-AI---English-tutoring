/**
 * T1.4: the session-start and review guards against a real local D1 and KV.
 * The session-start route arrives in T1.3; it calls guardSessionStart() last, after validation.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  guardReviewSave,
  guardSessionStart,
  readDemoStatus,
  recordSpeechMinutes,
  setPaused,
} from "../app/lib/limits";
import { applyMigrations, createTestDatabase, type TestD1, type TestKV } from "./d1";

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

const NOW = new Date("2026-11-04T12:00:00Z");
const CAP = 80;
const start = (ipHash = "ip-a", now = NOW) =>
  guardSessionStart({ db, kv, ipHash, dailySttMinutesCap: CAP, now });

async function errorCode(response: Response | null) {
  if (!response) return null;
  const body = (await response.json()) as { error: { code: string; message: string } };
  return { status: response.status, ...body.error };
}

describe("tests per IP", () => {
  it("allows 3 session starts, then refuses the 4th with 429 RATE_LIMITED", async () => {
    for (let i = 0; i < 3; i++) expect(await start()).toBeNull();
    const refused = await errorCode(await start());
    expect(refused).toMatchObject({ status: 429, code: "RATE_LIMITED", retryable: false });
    expect(refused?.message).toMatch(/today's 3 tests/);
    expect(await start("ip-b")).toBeNull();
  });

  it("counts started tests for the day", async () => {
    await start();
    await start("ip-b");
    const row = await db
      .prepare("SELECT tests_started AS n FROM usage_daily WHERE date = ?1")
      .bind("2026-11-04")
      .first<{ n: number }>();
    expect(row?.n).toBe(2);
  });
});

describe("daily speech budget", () => {
  it("at the cap, refuses new sessions with 503 DEMO_PAUSED", async () => {
    await recordSpeechMinutes(db, NOW, CAP);
    expect(await errorCode(await start())).toMatchObject({ status: 503, code: "DEMO_PAUSED" });
  });

  it("does not use up a test when the demo is paused", async () => {
    await recordSpeechMinutes(db, NOW, CAP);
    for (let i = 0; i < 5; i++) await start();
    const later = new Date("2026-11-05T09:00:00Z");
    expect(await start("ip-a", later)).toBeNull();
    expect(await kv.get("tests:ip-a:2026-11-04")).toBeNull();
  });

  it("lets an in-progress attempt finish: its minutes are still recorded past the cap", async () => {
    expect(await start()).toBeNull(); // session started under the cap
    await recordSpeechMinutes(db, NOW, CAP - 0.5);
    await recordSpeechMinutes(db, NOW, 1.5); // the running attempt, which nothing blocks
    expect((await readDemoStatus(db, NOW)).sttMinutes).toBeCloseTo(CAP + 1);
    expect(await errorCode(await start("ip-b"))).toMatchObject({ code: "DEMO_PAUSED" });
  });

  it("resets the next UTC day", async () => {
    await recordSpeechMinutes(db, NOW, CAP);
    expect(await start("ip-a", new Date("2026-11-05T00:00:01Z"))).toBeNull();
  });
});

describe("kill switch", () => {
  it("refuses the very next start, and lets starts through again when off", async () => {
    expect(await start()).toBeNull();
    await setPaused(db, NOW, true);
    expect(await errorCode(await start())).toMatchObject({ status: 503, code: "DEMO_PAUSED" });
    await setPaused(db, NOW, false);
    expect(await start()).toBeNull();
  });

  it("stays on across midnight until turned off", async () => {
    await setPaused(db, NOW, true);
    const nextDay = new Date("2026-11-05T08:00:00Z");
    expect((await readDemoStatus(db, nextDay)).paused).toBe(true);
    await recordSpeechMinutes(db, nextDay, 1); // creating the new day's row keeps the switch on
    expect(await errorCode(await start("ip-a", nextDay))).toMatchObject({ code: "DEMO_PAUSED" });
  });
});

describe("reviews per IP", () => {
  it("allows 20 review saves a day, then 429 RATE_LIMITED", async () => {
    for (let i = 0; i < 20; i++)
      expect(await guardReviewSave({ kv, ipHash: "ip-a", now: NOW })).toBeNull();
    expect(await errorCode(await guardReviewSave({ kv, ipHash: "ip-a", now: NOW }))).toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
    });
  });
});
