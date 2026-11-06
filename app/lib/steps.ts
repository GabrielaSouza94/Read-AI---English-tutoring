/**
 * The progressive step engine (T2.3; BR-02, BR-RULE-04, TR-02). For a story of n sentences:
 * steps 1..n read sentences 1..k, then two full-story reads. Each step allows the test's
 * `max_attempts_per_step`; a pass, or a fail on the last attempt, moves to the next step.
 * Pure: the session state is stored in KV by `~/lib/test-session`.
 */
import type { STEP_TYPES } from "../db/schema";

export type StepType = (typeof STEP_TYPES)[number];

export type Step = {
  number: number;
  type: StepType;
  sentenceIds: number[];
  /** 1 or 2 for the full-story reads, otherwise null. */
  fullReadNumber: 1 | 2 | null;
};

const FULL_READS = [1, 2] as const;

/** The steps for a test, from its sentence ids in reading order. */
export function buildSteps(sentenceIds: number[]): Step[] {
  if (sentenceIds.length === 0) throw new Error("test has no sentences");
  const progressive = sentenceIds.map((_, i): Step => ({
    number: i + 1,
    type: "progressive",
    sentenceIds: sentenceIds.slice(0, i + 1),
    fullReadNumber: null,
  }));
  const full = FULL_READS.map((read): Step => ({
    number: sentenceIds.length + read,
    type: "full_story",
    sentenceIds: [...sentenceIds],
    fullReadNumber: read,
  }));
  return [...progressive, ...full];
}

export type StepRecord = { stepNumber: number; attempts: number; passed: boolean };

/** One participant's progress through one test. */
export type TestSession = {
  participantId: string;
  testId: number;
  /** The step being read now (1-based); the last step once done. */
  stepNumber: number;
  /** Attempts already made on the current step. */
  attempt: number;
  history: StepRecord[];
  done: boolean;
  startedAt: number;
  updatedAt: number;
};

export function newTestSession(participantId: string, testId: number, now: Date): TestSession {
  return {
    participantId,
    testId,
    stepNumber: 1,
    attempt: 0,
    history: [],
    done: false,
    startedAt: now.getTime(),
    updatedAt: now.getTime(),
  };
}

export type AttemptOutcome = "passed" | "retry" | "auto-progressed";

export type StepRules = { maxAttempts: number; stepCount: number };

/** The session after one scored attempt on the current step. */
export function applyAttempt(
  session: TestSession,
  passed: boolean,
  rules: StepRules,
  now: Date,
): { session: TestSession; outcome: AttemptOutcome } {
  if (session.done) throw new Error("test already finished");
  const attempts = session.attempt + 1;
  const updatedAt = now.getTime();

  if (!passed && attempts < rules.maxAttempts) {
    return { session: { ...session, attempt: attempts, updatedAt }, outcome: "retry" };
  }

  const history = [...session.history, { stepNumber: session.stepNumber, attempts, passed }];
  const last = session.stepNumber >= rules.stepCount;
  return {
    session: {
      ...session,
      stepNumber: last ? session.stepNumber : session.stepNumber + 1,
      attempt: 0,
      history,
      done: last,
      updatedAt,
    },
    outcome: passed ? "passed" : "auto-progressed",
  };
}

/** Shown after each attempt (BR-RULE-04: an encouraging message when moving on after the limit). */
export const OUTCOME_MESSAGES: Record<AttemptOutcome, string> = {
  passed: "Well done! On to the next step.",
  retry: "Not quite yet. Look at the highlighted words and try again.",
  "auto-progressed": "Good effort! Let's move on. You will read these sentences again later.",
};
