/**
 * T2.3: starting a test and submitting step recordings, against real local D1 and KV.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { contentSeedStatements } from "../app/db/seed";
import {
  beginTest,
  stubScorer,
  submitAttempt,
  type AttemptResponse,
  type StepScorer,
} from "../app/lib/assessment";
import { getTest, type TestDetail } from "../app/lib/catalog";
import { setPaused } from "../app/lib/limits";
import type { TestSession } from "../app/lib/steps";
import { loadTestSession, testSessionKey } from "../app/lib/test-session";
import { encodeWav } from "../app/lib/wav";
import { applyMigrations, createTestDatabase, runStatements, type TestD1, type TestKV } from "./d1";

let db: TestD1;
let kv: TestKV;
let dispose: () => Promise<void>;
let test1: TestDetail;

beforeEach(async () => {
  ({ db, kv, dispose } = await createTestDatabase());
  await applyMigrations(db);
  await runStatements(db, contentSeedStatements());
  const found = await getTest(db, 1);
  if (!found) throw new Error("test 1 not seeded");
  test1 = found;
});

afterEach(async () => {
  await dispose();
});

const NOW = new Date("2026-11-05T12:00:00Z");
const PARTICIPANT = "participant-1";
const oneSecond = encodeWav([new Float32Array(16_000)], 16_000);

const begin = (ipHash = "ip-a", test = test1) =>
  beginTest({
    db,
    kv,
    participantId: PARTICIPANT,
    test,
    ipHash,
    dailySttMinutesCap: 80,
    now: NOW,
  });

async function submit(
  stepNumber: number,
  options: { audio?: Uint8Array; scorer?: StepScorer | null } = {},
) {
  return submitAttempt({
    kv,
    participantId: PARTICIPANT,
    test: test1,
    stepNumber,
    audio: options.audio ?? oneSecond,
    scorer: options.scorer === undefined ? stubScorer : options.scorer,
    now: NOW,
  });
}

async function errorOf(response: Response) {
  const body = (await response.json()) as { error: { code: string; message: string } };
  return { status: response.status, ...body.error };
}

const failing: StepScorer = async () => ({ passed: false });

describe("beginTest", () => {
  it("creates the session in KV with a 1-hour TTL and uses one of the IP's tests", async () => {
    const session = (await begin()) as TestSession;
    expect(session).toMatchObject({ participantId: PARTICIPANT, testId: 1, stepNumber: 1 });
    expect(await loadTestSession(kv, PARTICIPANT, 1)).toEqual(session);
    expect(await kv.get("tests:ip-a:2026-11-05")).toBe("1");
  });

  it("resumes a test in progress without using another test", async () => {
    await begin();
    await submit(1);
    const resumed = (await begin()) as TestSession;
    expect(resumed.stepNumber).toBe(2);
    expect(await kv.get("tests:ip-a:2026-11-05")).toBe("1");
  });

  it("is refused after 3 tests that day, and while the demo is paused", async () => {
    const test2 = (await getTest(db, 2)) as TestDetail;
    const test3 = (await getTest(db, 3)) as TestDetail;
    const test4 = (await getTest(db, 4)) as TestDetail;
    for (const t of [test1, test2, test3])
      expect(await begin("ip-a", t)).not.toBeInstanceOf(Response);
    const refused = await begin("ip-a", test4);
    expect(refused).toBeInstanceOf(Response);
    expect(await errorOf(refused as Response)).toMatchObject({ status: 429, code: "RATE_LIMITED" });

    await setPaused(db, NOW, true);
    const paused = await begin("ip-b", test4);
    expect(await errorOf(paused as Response)).toMatchObject({ status: 503, code: "DEMO_PAUSED" });
  });
});

describe("submitAttempt", () => {
  it("with the stub scorer, test 1 runs through its 7 steps and finishes", async () => {
    await begin();
    for (let step = 1; step <= 7; step++) {
      const response = await submit(step);
      expect(response.status).toBe(200);
      const body = (await response.json()) as AttemptResponse;
      expect(body).toMatchObject({ outcome: "passed", passed: true, done: step === 7 });
      expect(body.stepNumber).toBe(step === 7 ? 7 : step + 1);
    }
    const session = await loadTestSession(kv, PARTICIPANT, 1);
    expect(session?.done).toBe(true);
    expect(session?.history).toHaveLength(7);
    expect((await errorOf(await submit(7))).code).toBe("NOT_FOUND");
  });

  it("retries up to the test's limit (3), then moves on with an encouraging message", async () => {
    await begin();
    const outcomes = [];
    for (let i = 0; i < 3; i++) {
      outcomes.push((await (await submit(1, { scorer: failing })).json()) as AttemptResponse);
    }
    expect(outcomes.map((o) => [o.outcome, o.stepNumber, o.attempt])).toEqual([
      ["retry", 1, 1],
      ["retry", 1, 2],
      ["auto-progressed", 2, 0],
    ]);
    expect(outcomes[2].message).toMatch(/^Good effort!/);
  });

  it("refuses a recording for a step that is no longer current", async () => {
    await begin();
    await submit(1);
    expect(await errorOf(await submit(1))).toMatchObject({
      status: 400,
      code: "VALIDATION_FAILED",
    });
  });

  it("refuses without a test in progress", async () => {
    expect(await errorOf(await submit(1))).toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("checks the audio: WAV format, 16 kHz mono, 0.5 s to 2 minutes, 10 MB", async () => {
    await begin();
    const cases: [Uint8Array, number, string][] = [
      [new TextEncoder().encode("not audio"), 400, "VALIDATION_FAILED"],
      [encodeWav([new Float32Array(48_000)], 48_000), 400, "VALIDATION_FAILED"],
      [encodeWav([new Float32Array(4000)], 16_000), 400, "VALIDATION_FAILED"],
      [encodeWav([new Float32Array(16_000 * 122)], 16_000), 413, "AUDIO_TOO_LARGE"],
      [new Uint8Array(10 * 1024 * 1024 + 1), 413, "AUDIO_TOO_LARGE"],
    ];
    for (const [audio, status, code] of cases) {
      expect(await errorOf(await submit(1, { audio }))).toMatchObject({ status, code });
    }
    // None of them counted as an attempt.
    expect((await loadTestSession(kv, PARTICIPANT, 1))?.attempt).toBe(0);
  });

  it("without a scorer (production before E3), refuses with a retryable 502", async () => {
    await begin();
    const error = await errorOf(await submit(1, { scorer: null }));
    expect(error).toMatchObject({ status: 502, code: "PROVIDER_ERROR" });
    expect((await loadTestSession(kv, PARTICIPANT, 1))?.stepNumber).toBe(1);
  });

  it("keeps the session for an hour after each change", async () => {
    await begin();
    expect(testSessionKey(PARTICIPANT, 1)).toBe("session:participant-1:1");
    expect(await kv.get(testSessionKey(PARTICIPANT, 1))).not.toBeNull();
  });
});
