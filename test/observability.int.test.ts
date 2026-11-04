import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { runAlertCheck } from "../app/lib/alerts";
import { recordAdminAction } from "../app/lib/audit";
import { readHour, recordProviderCall, recordRequest } from "../app/lib/metrics";
import { applyMigrations, count, createTestDatabase, type TestD1 } from "./d1";

let db: TestD1;
let dispose: () => Promise<void>;

beforeEach(async () => {
  ({ db, dispose } = await createTestDatabase());
  await applyMigrations(db);
});

afterEach(async () => {
  await dispose();
});

const AT = new Date("2026-11-03T14:20:00Z");

describe("hourly metrics", () => {
  it("counts concurrent requests without losing any", async () => {
    await Promise.all(
      Array.from({ length: 25 }, (_, i) => recordRequest(db, AT, i < 3 ? 503 : 200)),
    );
    await recordProviderCall(db, AT, true);
    await recordProviderCall(db, AT, false);

    expect(await readHour(db, "2026-11-03T14")).toEqual({
      requests: 25,
      serverErrors: 3,
      providerCalls: 2,
      providerErrors: 1,
    });
    expect(await count(db, "metrics_hourly")).toBe(1);
  });

  it("returns zeros for an hour with no traffic", async () => {
    expect(await readHour(db, "2026-11-03T03")).toEqual({
      requests: 0,
      serverErrors: 0,
      providerCalls: 0,
      providerErrors: 0,
    });
  });
});

describe("alert check", () => {
  it("alerts once from the previous hour's counters and today's speech minutes", async () => {
    for (let i = 0; i < 20; i++) await recordRequest(db, AT, i < 2 ? 500 : 200);
    await db
      .prepare("INSERT INTO usage_daily (date, stt_minutes) VALUES ('2026-11-03', 70)")
      .bind()
      .run();

    const store = new Map<string, string>();
    const kv = {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => void store.set(key, value),
    };
    const notified: string[] = [];
    const deps = {
      db,
      kv,
      notify: async (alert: { kind: string }) => void notified.push(alert.kind),
      dailySttMinutesCap: 80,
      now: new Date("2026-11-03T15:05:00Z"),
      log: { info() {}, warn() {}, error() {}, with: () => deps.log },
    };

    await runAlertCheck(deps);
    await runAlertCheck(deps); // a repeated cron run sends nothing new

    expect(notified.sort()).toEqual(["server_errors", "speech_budget"]);
  });
});

describe("admin audit", () => {
  it("writes one row per action, with names and IPs removed from details", async () => {
    await recordAdminAction(db, {
      action: "hide",
      adminId: 1,
      targetType: "test_result",
      targetId: 42,
      details: { reason: "spam", reviewerName: "Ana", ip: "203.0.113.9" },
      requestId: "req-1",
    });
    await recordAdminAction(db, { action: "login_failed", adminId: null });

    expect(await count(db, "admin_audit")).toBe(2);
    const row = await db
      .prepare(
        "SELECT action, admin_id, target_type, target_id, details, request_id, created_at FROM admin_audit WHERE action = 'hide'",
      )
      .first<Record<string, unknown>>();
    expect(row).toMatchObject({
      action: "hide",
      admin_id: 1,
      target_type: "test_result",
      target_id: "42",
      request_id: "req-1",
    });
    expect(JSON.parse(row?.details as string)).toEqual({
      reason: "spam",
      reviewerName: "[redacted]",
      ip: "[redacted]",
    });
    expect(row?.created_at).toEqual(expect.any(Number));
  });
});
