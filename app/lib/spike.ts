/**
 * Shared guard for the T0.5 spike routes: never in production, and at most SPIKE_DAILY_CAP paid
 * calls a day per environment, so a public staging URL cannot run up a bill.
 */
import { SEED_TESTS } from "../db/seed-data";
import type { KVLike } from "./alerts";
import { apiError } from "./errors";

export const SPIKE_DAILY_CAP = 60;

export async function spikeGuard(appEnv: string, kv: KVLike): Promise<Response | null> {
  if (appEnv === "production") return apiError("NOT_FOUND", "Not found");
  const key = `spike:${new Date().toISOString().slice(0, 10)}`;
  const used = Number((await kv.get(key)) ?? 0);
  if (used >= SPIKE_DAILY_CAP) return apiError("RATE_LIMITED", "Spike daily cap reached");
  await kv.put(key, String(used + 1), { expirationTtl: 2 * 24 * 3600 });
  return null;
}

/** Sentences `from`..`to` (1-based, inclusive) of test `test` (default: test 4, all sentences). */
export function spikeSentences(url: URL): string[] | Response {
  const test = SEED_TESTS.find((t) => t.id === Number(url.searchParams.get("test") ?? 4));
  if (!test) return apiError("NOT_FOUND", "Unknown test");
  const from = Number(url.searchParams.get("from") ?? 1);
  const to = Number(url.searchParams.get("to") ?? test.sentences.length);
  const sentences = test.sentences.slice(from - 1, to);
  if (sentences.length === 0) return apiError("VALIDATION_FAILED", "No sentences in range");
  return sentences;
}
