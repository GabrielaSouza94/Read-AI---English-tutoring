/**
 * Abuse and cost controls (BR-16, BR-RULE-13, TR-15), shared by session start (T1.3), attempts
 * (T3.1) and review save (T5.x).
 *
 * - Per-IP daily counters live in KV (`tests:{ipHash}:{date}`, `reviews:{ipHash}:{date}`). KV has
 *   no atomic increment, so two requests at the same instant can both pass; the API rate limit
 *   and the speech budget bound what that costs.
 * - The speech budget and the kill switch live in D1 `usage_daily`, which is read fresh on every
 *   request, so turning the switch on refuses the very next start. The switch is the `paused` flag
 *   of the latest row, and a new day's row copies it, so it stays on across midnight.
 *
 * Runtime-neutral: the integration tests run it against Miniflare D1 and KV.
 */
import type { KVLike } from "./alerts";
import { apiError } from "./errors";
import { dayKey, type D1Like } from "./metrics";

export const DAILY_LIMITS = { tests: 3, reviews: 20 } as const;
export type LimitKind = keyof typeof DAILY_LIMITS;

/** Counter keys carry the date, so the TTL only cleans up; the count resets at midnight UTC. */
export const COUNTER_TTL_SECONDS = 24 * 3600;

/** Per-IP limit on every `/api/*` request (the Workers rate-limiting binding, API_RATE_LIMITER). */
export const API_RATE_LIMIT = { limit: 60, periodSeconds: 60 } as const;

export function counterKey(kind: LimitKind, ipHash: string, at: Date): string {
  return `${kind}:${ipHash}:${dayKey(at)}`;
}

export type LimitResult = { allowed: boolean; used: number; limit: number };

/** Counts one use if the IP is under today's limit. A refused request is not counted. */
export async function consumeDailyLimit(
  kv: KVLike,
  kind: LimitKind,
  ipHash: string,
  at: Date,
): Promise<LimitResult> {
  const limit = DAILY_LIMITS[kind];
  const key = counterKey(kind, ipHash, at);
  const raw = await kv.get(key);
  const parsed = raw === null ? 0 : Number(raw);
  // A value we cannot read counts as used up: failing closed costs one visitor a day, not money.
  const used = Number.isInteger(parsed) && parsed >= 0 ? parsed : limit;
  if (used >= limit) return { allowed: false, used, limit };
  await kv.put(key, String(used + 1), { expirationTtl: COUNTER_TTL_SECONDS });
  return { allowed: true, used: used + 1, limit };
}

// --- usage_daily: speech budget and kill switch ---

/** Creates today's row if needed, carrying the kill switch over from the latest earlier row. */
const ENSURE_DAY = `INSERT INTO usage_daily (date, paused)
  VALUES (?1, COALESCE((SELECT paused FROM usage_daily WHERE date < ?1 ORDER BY date DESC LIMIT 1), 0))
  ON CONFLICT(date) DO NOTHING`;

async function updateDay(db: D1Like, at: Date, sql: string, value: number): Promise<void> {
  const day = dayKey(at);
  await db.batch([db.prepare(ENSURE_DAY).bind(day), db.prepare(sql).bind(day, value)]);
}

/** Adds the speech minutes of one scored attempt. Never refused: a running test may finish. */
export function recordSpeechMinutes(db: D1Like, at: Date, minutes: number): Promise<void> {
  return updateDay(
    db,
    at,
    "UPDATE usage_daily SET stt_minutes = stt_minutes + ?2 WHERE date = ?1",
    minutes,
  );
}

/** Turns the kill switch on or off (admin, T5.x). Takes effect on the next request. */
export function setPaused(db: D1Like, at: Date, paused: boolean): Promise<void> {
  return updateDay(db, at, "UPDATE usage_daily SET paused = ?2 WHERE date = ?1", paused ? 1 : 0);
}

function recordTestStarted(db: D1Like, at: Date): Promise<void> {
  return updateDay(
    db,
    at,
    "UPDATE usage_daily SET tests_started = tests_started + ?2 WHERE date = ?1",
    1,
  );
}

export type DemoStatus = { sttMinutes: number; paused: boolean };

/** Today's speech minutes, and the kill switch from the latest row up to today. */
export async function readDemoStatus(db: D1Like, at: Date): Promise<DemoStatus> {
  const row = await db
    .prepare(
      `SELECT (SELECT stt_minutes FROM usage_daily WHERE date = ?1) AS minutes,
              (SELECT paused FROM usage_daily WHERE date <= ?1 ORDER BY date DESC LIMIT 1) AS paused`,
    )
    .bind(dayKey(at))
    .first<{ minutes: number | null; paused: number | null }>();
  return { sttMinutes: row?.minutes ?? 0, paused: row?.paused === 1 };
}

// --- Guards: null means go ahead; otherwise return the S-1 response as is ---

const MESSAGES = {
  // Wording from task-breakdown.md T2 error states ("Demo paused until tomorrow", "today's 3 tests").
  paused: "Demo paused. Please try again later.",
  budget: "Demo paused until tomorrow: today's speech budget is used up.",
  tests: `You've reached today's ${DAILY_LIMITS.tests} tests. Please come back tomorrow.`,
  reviews: `You've reached today's ${DAILY_LIMITS.reviews} reviews. Please come back tomorrow.`,
};

export type SessionGuardInput = {
  db: D1Like;
  kv: KVLike;
  ipHash: string;
  dailySttMinutesCap: number;
  now: Date;
};

/**
 * Checks the kill switch, the speech budget and the IP's daily test limit, then counts the test.
 * Call it last, after consent and captcha pass, so a rejected form does not use up a test.
 */
export async function guardSessionStart(input: SessionGuardInput): Promise<Response | null> {
  const { db, kv, ipHash, dailySttMinutesCap, now } = input;
  const status = await readDemoStatus(db, now);
  if (status.paused) return apiError("DEMO_PAUSED", MESSAGES.paused);
  if (status.sttMinutes >= dailySttMinutesCap) return apiError("DEMO_PAUSED", MESSAGES.budget);
  const tests = await consumeDailyLimit(kv, "tests", ipHash, now);
  if (!tests.allowed) return apiError("RATE_LIMITED", MESSAGES.tests);
  await recordTestStarted(db, now);
  return null;
}

/** The IP's daily review limit (20). Call it after the captcha and input checks pass. */
export async function guardReviewSave(input: {
  kv: KVLike;
  ipHash: string;
  now: Date;
}): Promise<Response | null> {
  const reviews = await consumeDailyLimit(input.kv, "reviews", input.ipHash, input.now);
  return reviews.allowed ? null : apiError("RATE_LIMITED", MESSAGES.reviews);
}

export type RateLimiterLike = { limit(options: { key: string }): Promise<{ success: boolean }> };

/** The per-IP burst limit on `/api/*`. Without the binding (unit tests) it lets requests through. */
export async function checkApiRateLimit(
  limiter: RateLimiterLike | undefined,
  url: URL,
  ip: string,
): Promise<Response | null> {
  if (!limiter || !url.pathname.startsWith("/api/")) return null;
  const { success } = await limiter.limit({ key: ip });
  return success
    ? null
    : apiError("RATE_LIMITED", "Too many requests. Please wait a minute and try again.", {
        retryable: true,
      });
}
