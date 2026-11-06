/**
 * Hourly request and provider counters in `metrics_hourly` (T0.4). Each write is a single atomic
 * upsert, so concurrent requests never lose a count. The hourly alert check reads them.
 */

type D1Statement = {
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
};

export type D1Like = {
  prepare(sql: string): { bind(...values: unknown[]): D1Statement };
  /** Runs the statements in one transaction. */
  batch(statements: D1Statement[]): Promise<unknown>;
};

export type HourCounters = {
  requests: number;
  serverErrors: number;
  providerCalls: number;
  providerErrors: number;
};

/** `YYYY-MM-DDTHH` in UTC. */
export function hourKey(date: Date): string {
  return date.toISOString().slice(0, 13);
}

/** `YYYY-MM-DD` in UTC, the key of `usage_daily`. */
export function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function recordRequest(db: D1Like, at: Date, status: number): Promise<void> {
  await db
    .prepare(
      `INSERT INTO metrics_hourly (hour, requests, server_errors) VALUES (?1, 1, ?2)
       ON CONFLICT (hour) DO UPDATE SET
         requests = requests + 1,
         server_errors = server_errors + excluded.server_errors`,
    )
    .bind(hourKey(at), status >= 500 ? 1 : 0)
    .run();
}

/** One external scorer or LLM call. `ok` is false when it still failed after its retry (S-2). */
export async function recordProviderCall(db: D1Like, at: Date, ok: boolean): Promise<void> {
  await db
    .prepare(
      `INSERT INTO metrics_hourly (hour, provider_calls, provider_errors) VALUES (?1, 1, ?2)
       ON CONFLICT (hour) DO UPDATE SET
         provider_calls = provider_calls + 1,
         provider_errors = provider_errors + excluded.provider_errors`,
    )
    .bind(hourKey(at), ok ? 0 : 1)
    .run();
}

export async function readHour(db: D1Like, hour: string): Promise<HourCounters> {
  const row = await db
    .prepare(
      `SELECT requests, server_errors AS serverErrors, provider_calls AS providerCalls,
              provider_errors AS providerErrors
       FROM metrics_hourly WHERE hour = ?1`,
    )
    .bind(hour)
    .first<HourCounters>();
  return row ?? { requests: 0, serverErrors: 0, providerCalls: 0, providerErrors: 0 };
}

export async function readSpeechMinutes(db: D1Like, day: string): Promise<number> {
  const row = await db
    .prepare(`SELECT stt_minutes AS minutes FROM usage_daily WHERE date = ?1`)
    .bind(day)
    .first<{ minutes: number }>();
  return row?.minutes ?? 0;
}
