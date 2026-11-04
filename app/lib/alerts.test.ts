import { describe, expect, it } from "vitest";

import { type Alert, type AlertInput, evaluateAlerts, sendAlerts, testAlert } from "./alerts";
import { createLogger } from "./log";

const QUIET: AlertInput = {
  hour: "2026-11-03T14",
  counters: { requests: 100, serverErrors: 0, providerCalls: 20, providerErrors: 0 },
  day: "2026-11-03",
  speechMinutes: 10,
  dailySttMinutesCap: 80,
};

const kinds = (input: Partial<AlertInput>) =>
  evaluateAlerts({ ...QUIET, ...input }).map((alert) => alert.kind);

const counters = (overrides: Partial<AlertInput["counters"]>) => ({
  counters: { ...QUIET.counters, ...overrides },
});

describe("evaluateAlerts", () => {
  it("raises nothing on a quiet hour", () => {
    expect(kinds({})).toEqual([]);
  });

  it("warns when speech minutes reach 80% of the daily cap", () => {
    expect(kinds({ speechMinutes: 63.9 })).toEqual([]);
    expect(kinds({ speechMinutes: 64 })).toEqual(["speech_budget"]);
  });

  it("alerts when provider errors exceed 10% of calls in the hour", () => {
    expect(kinds(counters({ providerCalls: 20, providerErrors: 2 }))).toEqual([]);
    expect(kinds(counters({ providerCalls: 20, providerErrors: 3 }))).toEqual(["provider_errors"]);
  });

  it("alerts when 5xx responses exceed 5% of requests in the hour", () => {
    expect(kinds(counters({ requests: 100, serverErrors: 5 }))).toEqual([]);
    expect(kinds(counters({ requests: 100, serverErrors: 6 }))).toEqual(["server_errors"]);
  });

  it("ignores rates on tiny volumes", () => {
    expect(
      kinds(counters({ requests: 9, serverErrors: 9, providerCalls: 2, providerErrors: 2 })),
    ).toEqual([]);
  });

  it("keys each alert to its day or hour, so it is sent once", () => {
    const alerts = evaluateAlerts({
      ...QUIET,
      speechMinutes: 80,
      counters: { requests: 10, serverErrors: 10, providerCalls: 3, providerErrors: 3 },
    });
    expect(alerts.map((alert) => alert.dedupeKey)).toEqual([
      "speech_budget:2026-11-03",
      "provider_errors:2026-11-03T14",
      "server_errors:2026-11-03T14",
    ]);
    expect(alerts[0].subject).toBe("Speech budget at 100.0% today");
  });
});

describe("sendAlerts", () => {
  const silent = createLogger({}, () => {});
  const memoryKv = () => {
    const store = new Map<string, string>();
    return {
      store,
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => void store.set(key, value),
    };
  };

  it("sends an alert once until its dedupe key expires", async () => {
    const kv = memoryKv();
    const sent: Alert[] = [];
    const notify = async (alert: Alert) => void sent.push(alert);
    const alert = testAlert(new Date("2026-11-03T15:00:00Z"));

    await sendAlerts([alert], { kv, notify, log: silent });
    await sendAlerts([alert], { kv, notify, log: silent });

    expect(sent).toHaveLength(1);
    expect(kv.store.has("alert:test")).toBe(true);
  });

  it("retries next run when delivery fails, and logs the alert anyway", async () => {
    const kv = memoryKv();
    const lines: string[] = [];
    const log = createLogger({}, (_level, line) => lines.push(line));
    const failing = async () => {
      throw new Error("Resend returned 500");
    };

    const result = await sendAlerts([testAlert(new Date())], { kv, notify: failing, log });

    expect(result).toEqual([]);
    expect(kv.store.size).toBe(0);
    expect(lines.map((line) => JSON.parse(line).event)).toEqual(["alert", "alert_delivery_failed"]);
  });
});
