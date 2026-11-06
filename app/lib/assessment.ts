/**
 * Starting a test and submitting a recording for its current step (T2.3; TR-01, TR-02).
 * Scoring is behind `StepScorer`: until Epic E3 the only scorer is the stub, which always passes
 * and is switched on per environment by `STUB_SCORER` (never in production).
 *
 * Runtime-neutral: routes pass the Worker bindings, integration tests pass Miniflare ones.
 * Audio is only held for the request; nothing about it is stored except the step's outcome.
 */
import type { KVLike } from "./alerts";
import type { TestDetail } from "./catalog";
import { apiError } from "./errors";
import { guardTestStart } from "./limits";
import type { D1Like } from "./metrics";
import { MAX_RECORDING_BYTES, MAX_RECORDING_MS } from "./recorder-machine";
import {
  applyAttempt,
  buildSteps,
  newTestSession,
  OUTCOME_MESSAGES,
  type AttemptOutcome,
  type Step,
  type TestSession,
} from "./steps";
import { loadTestSession, saveTestSession } from "./test-session";
import { parseWav, WavError } from "./wav";

export type StepScorer = (input: {
  wav: Uint8Array;
  step: Step;
  test: TestDetail;
}) => Promise<{ passed: boolean; highlightedWords?: string[] }>;

/** Gate A stand-in (T2.3): every attempt passes. */
export const stubScorer: StepScorer = async () => ({ passed: true });

export const MIN_RECORDING_SEC = 0.5;
// The browser stops at exactly 120 s; allow a little for rounding.
const MAX_RECORDING_SEC = MAX_RECORDING_MS / 1000 + 1;

export type BeginInput = {
  db: D1Like;
  kv: KVLike;
  participantId: string;
  test: TestDetail;
  ipHash: string;
  dailySttMinutesCap: number;
  now: Date;
};

/**
 * Resumes the test in progress, or starts it: a new start uses one of the IP's 3 daily tests and
 * is refused while the demo is paused (T1.4).
 */
export async function beginTest(input: BeginInput): Promise<TestSession | Response> {
  const existing = await loadTestSession(input.kv, input.participantId, input.test.id);
  if (existing && !existing.done) return existing;
  const refused = await guardTestStart(input);
  if (refused) return refused;
  const session = newTestSession(input.participantId, input.test.id, input.now);
  await saveTestSession(input.kv, session);
  return session;
}

export type AttemptResponse = {
  /** Words to practise before the retry (T2.4); empty when the test moves on. */
  highlightedWords: string[];
  outcome: AttemptOutcome;
  passed: boolean;
  message: string;
  stepNumber: number;
  attempt: number;
  done: boolean;
};

export type SubmitInput = {
  kv: KVLike;
  participantId: string;
  test: TestDetail;
  /** The step the browser recorded; must still be the current one. */
  stepNumber: number;
  audio: Uint8Array;
  scorer: StepScorer | null;
  now: Date;
};

export async function submitAttempt(input: SubmitInput): Promise<Response> {
  const { kv, participantId, test, now } = input;
  const session = await loadTestSession(kv, participantId, test.id);
  if (!session || session.done) {
    return apiError("NOT_FOUND", "This test is not in progress. Please start it again.");
  }
  if (input.stepNumber !== session.stepNumber) {
    return apiError("VALIDATION_FAILED", "This step is out of date. Please reload the page.", {
      fields: { stepNumber: `The current step is ${session.stepNumber}.` },
    });
  }

  if (input.audio.length > MAX_RECORDING_BYTES) {
    return apiError("AUDIO_TOO_LARGE", "The recording is larger than 10 MB. Please record again.");
  }
  let durationSec: number;
  try {
    const info = parseWav(input.audio);
    if (info.sampleRate !== 16_000 || info.channels !== 1 || info.bitsPerSample !== 16) {
      return apiError("VALIDATION_FAILED", "The recording must be 16 kHz mono WAV.");
    }
    durationSec = info.durationSec;
  } catch (error) {
    if (!(error instanceof WavError)) throw error;
    return apiError("VALIDATION_FAILED", "The recording could not be read. Please record again.");
  }
  if (durationSec > MAX_RECORDING_SEC) {
    return apiError(
      "AUDIO_TOO_LARGE",
      "The recording is longer than 2 minutes. Please record again.",
    );
  }
  if (durationSec < MIN_RECORDING_SEC) {
    return apiError("VALIDATION_FAILED", "The recording is too short. Please read the text aloud.");
  }

  if (!input.scorer) {
    return apiError("PROVIDER_ERROR", "Scoring is not available yet. Please try again later.", {
      retryable: true,
    });
  }
  const steps = buildSteps(test.sentences.map((s) => s.id));
  const step = steps[session.stepNumber - 1];
  const scored = await input.scorer({ wav: input.audio, step, test });
  const passed = scored.passed;

  const next = applyAttempt(
    session,
    passed,
    { maxAttempts: test.maxAttemptsPerStep, stepCount: steps.length },
    now,
  );
  // The words stay on the session for the retry, so a reload shows them again (T2.4).
  next.session.highlightedWords = next.outcome === "retry" ? (scored.highlightedWords ?? []) : [];
  await saveTestSession(kv, next.session);

  const body: AttemptResponse = {
    outcome: next.outcome,
    passed,
    message: OUTCOME_MESSAGES[next.outcome],
    stepNumber: next.session.stepNumber,
    attempt: next.session.attempt,
    done: next.session.done,
    highlightedWords: next.session.highlightedWords,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
