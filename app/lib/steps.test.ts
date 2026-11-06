import { describe, expect, it } from "vitest";

import { applyAttempt, buildSteps, newTestSession, type TestSession } from "./steps";

const NOW = new Date("2026-11-05T12:00:00Z");

describe("buildSteps", () => {
  it("5 sentences → 5 progressive steps and 2 full reads, with the right sentence ranges", () => {
    const steps = buildSteps([11, 12, 13, 14, 15]);
    expect(steps).toHaveLength(7);
    expect(steps.map((s) => s.sentenceIds)).toEqual([
      [11],
      [11, 12],
      [11, 12, 13],
      [11, 12, 13, 14],
      [11, 12, 13, 14, 15],
      [11, 12, 13, 14, 15],
      [11, 12, 13, 14, 15],
    ]);
    expect(steps.map((s) => [s.number, s.type, s.fullReadNumber])).toEqual([
      [1, "progressive", null],
      [2, "progressive", null],
      [3, "progressive", null],
      [4, "progressive", null],
      [5, "progressive", null],
      [6, "full_story", 1],
      [7, "full_story", 2],
    ]);
  });

  it("7 sentences → 9 steps", () => {
    const steps = buildSteps([1, 2, 3, 4, 5, 6, 7]);
    expect(steps).toHaveLength(9);
    expect(steps[6]).toEqual({
      number: 7,
      type: "progressive",
      sentenceIds: [1, 2, 3, 4, 5, 6, 7],
      fullReadNumber: null,
    });
    expect(steps.slice(7).map((s) => s.fullReadNumber)).toEqual([1, 2]);
  });

  it("refuses a test without sentences", () => {
    expect(() => buildSteps([])).toThrow(/no sentences/);
  });
});

describe("applyAttempt", () => {
  const rules = { maxAttempts: 3, stepCount: 7 };
  const at = (stepNumber: number, attempt = 0): TestSession => ({
    ...newTestSession("p1", 1, NOW),
    stepNumber,
    attempt,
  });

  it("starts on step 1 with no attempts", () => {
    expect(newTestSession("p1", 1, NOW)).toEqual({
      participantId: "p1",
      testId: 1,
      stepNumber: 1,
      attempt: 0,
      history: [],
      done: false,
      startedAt: NOW.getTime(),
      updatedAt: NOW.getTime(),
    });
  });

  it("a pass moves to the next step and resets the attempt counter", () => {
    const { session, outcome } = applyAttempt(at(1), true, rules, NOW);
    expect(outcome).toBe("passed");
    expect(session).toMatchObject({ stepNumber: 2, attempt: 0, done: false });
    expect(session.history).toEqual([{ stepNumber: 1, attempts: 1, passed: true }]);
  });

  it("fail on attempt 1 and 2 → retry; fail at the limit → auto-progress", () => {
    const first = applyAttempt(at(2), false, rules, NOW);
    expect(first.outcome).toBe("retry");
    expect(first.session).toMatchObject({ stepNumber: 2, attempt: 1 });

    const second = applyAttempt(first.session, false, rules, NOW);
    expect(second.outcome).toBe("retry");
    expect(second.session).toMatchObject({ stepNumber: 2, attempt: 2 });

    const third = applyAttempt(second.session, false, rules, NOW);
    expect(third.outcome).toBe("auto-progressed");
    expect(third.session).toMatchObject({ stepNumber: 3, attempt: 0 });
    expect(third.session.history).toEqual([{ stepNumber: 2, attempts: 3, passed: false }]);
  });

  it("a pass on the last attempt still counts as passed", () => {
    const { session, outcome } = applyAttempt(at(4, 2), true, rules, NOW);
    expect(outcome).toBe("passed");
    expect(session.history).toEqual([{ stepNumber: 4, attempts: 3, passed: true }]);
  });

  it("uses the test's own limit (2 for tests 3 and 4)", () => {
    const strict = { maxAttempts: 2, stepCount: 8 };
    const first = applyAttempt(at(1), false, strict, NOW);
    expect(first.outcome).toBe("retry");
    expect(applyAttempt(first.session, false, strict, NOW).outcome).toBe("auto-progressed");
  });

  it("finishes after the last step, whether passed or auto-progressed", () => {
    const passed = applyAttempt(at(7), true, rules, NOW);
    expect(passed.session).toMatchObject({ done: true, stepNumber: 7 });
    const moved = applyAttempt(at(7, 2), false, rules, NOW);
    expect(moved.outcome).toBe("auto-progressed");
    expect(moved.session.done).toBe(true);
  });

  it("does nothing once the test is done", () => {
    const done = { ...at(7), done: true };
    expect(() => applyAttempt(done, true, rules, NOW)).toThrow(/already finished/);
  });

  it("records the time of the change", () => {
    const later = new Date(NOW.getTime() + 5000);
    expect(applyAttempt(at(1), true, rules, later).session.updatedAt).toBe(later.getTime());
  });
});
