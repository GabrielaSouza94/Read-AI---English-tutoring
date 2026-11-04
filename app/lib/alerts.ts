/**
 * Owner alerts (T0.4). A Cron Trigger runs `runAlertCheck` at minute 5 of every hour. It reads the
 * previous full hour's counters and today's speech minutes, and emails the owner once per alert.
 */
import { createLogger, type Logger } from "./log";
import {
  type D1Like,
  type HourCounters,
  dayKey,
  hourKey,
  readHour,
  readSpeechMinutes,
} from "./metrics";

export const SPEECH_BUDGET_WARN_RATIO = 0.8;
export const PROVIDER_ERROR_RATE_LIMIT = 0.1;
export const SERVER_ERROR_RATE_LIMIT = 0.05;
/** Below these volumes one failure would trip a rate alert, so the rate is not judged. */
export const MIN_PROVIDER_CALLS = 3;
export const MIN_REQUESTS = 10;

export type AlertKind = "speech_budget" | "provider_errors" | "server_errors" | "test";

export type Alert = {
  kind: AlertKind;
  subject: string;
  text: string;
  /** The same key is sent at most once within `dedupeSeconds`. */
  dedupeKey: string;
  dedupeSeconds: number;
};

export type AlertInput = {
  hour: string;
  counters: HourCounters;
  day: string;
  speechMinutes: number;
  dailySttMinutesCap: number;
};

const percent = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;

/** The alerts that `input` should raise. Pure, so every threshold is unit-tested. */
export function evaluateAlerts(input: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const { hour, counters, day, speechMinutes, dailySttMinutesCap } = input;

  const budgetRatio = speechMinutes / dailySttMinutesCap;
  if (budgetRatio >= SPEECH_BUDGET_WARN_RATIO) {
    alerts.push({
      kind: "speech_budget",
      subject: `Speech budget at ${percent(budgetRatio)} today`,
      text: `${speechMinutes.toFixed(1)} of ${dailySttMinutesCap} speech minutes used on ${day} (UTC). The demo pauses itself at 100%.`,
      dedupeKey: `speech_budget:${day}`,
      dedupeSeconds: 2 * 24 * 3600,
    });
  }

  const { providerCalls, providerErrors, requests, serverErrors } = counters;
  if (
    providerCalls >= MIN_PROVIDER_CALLS &&
    providerErrors / providerCalls > PROVIDER_ERROR_RATE_LIMIT
  ) {
    alerts.push({
      kind: "provider_errors",
      subject: `Provider errors at ${percent(providerErrors / providerCalls)}`,
      text: `${providerErrors} of ${providerCalls} scorer or feedback calls failed after retry in the hour ${hour}:00 UTC.`,
      dedupeKey: `provider_errors:${hour}`,
      dedupeSeconds: 2 * 3600,
    });
  }

  if (requests >= MIN_REQUESTS && serverErrors / requests > SERVER_ERROR_RATE_LIMIT) {
    alerts.push({
      kind: "server_errors",
      subject: `Server errors (5xx) at ${percent(serverErrors / requests)}`,
      text: `${serverErrors} of ${requests} requests returned a 5xx status in the hour ${hour}:00 UTC.`,
      dedupeKey: `server_errors:${hour}`,
      dedupeSeconds: 2 * 3600,
    });
  }

  return alerts;
}

export function testAlert(now: Date): Alert {
  return {
    kind: "test",
    subject: "Test alert",
    text: `This is a test alert sent at ${now.toISOString()}. Alerts reach this inbox.`,
    dedupeKey: "test",
    dedupeSeconds: 10 * 60,
  };
}

export type KVLike = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
};

export type Notify = (alert: Alert) => Promise<void>;

export type AlertDeps = {
  db: D1Like;
  kv: KVLike;
  notify: Notify;
  dailySttMinutesCap: number;
  now?: Date;
  log?: Logger;
};

/** Sends `alerts` that were not sent recently. Returns the ones sent. */
export async function sendAlerts(
  alerts: Alert[],
  { kv, notify, log = createLogger() }: Pick<AlertDeps, "kv" | "notify" | "log">,
): Promise<Alert[]> {
  const sent: Alert[] = [];
  for (const alert of alerts) {
    const key = `alert:${alert.dedupeKey}`;
    if (await kv.get(key)) continue;
    // Logged first, so the alert is in Workers Logs even when email delivery fails.
    log.error("alert", { kind: alert.kind, subject: alert.subject, text: alert.text });
    try {
      await notify(alert);
      await kv.put(key, "1", { expirationTtl: Math.max(60, alert.dedupeSeconds) });
      sent.push(alert);
    } catch (error) {
      log.error("alert_delivery_failed", { kind: alert.kind, error });
    }
  }
  return sent;
}

export async function runAlertCheck(deps: AlertDeps): Promise<Alert[]> {
  const now = deps.now ?? new Date();
  const hour = hourKey(new Date(now.getTime() - 3600_000)); // the previous full hour
  const day = dayKey(now);
  const [counters, speechMinutes] = await Promise.all([
    readHour(deps.db, hour),
    readSpeechMinutes(deps.db, day),
  ]);
  const alerts = evaluateAlerts({
    hour,
    counters,
    day,
    speechMinutes,
    dailySttMinutesCap: deps.dailySttMinutesCap,
  });
  return sendAlerts(alerts, deps);
}
