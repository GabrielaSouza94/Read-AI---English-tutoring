import { describe, expect, it } from "vitest";

import {
  formatClock,
  INITIAL_STATE,
  MAX_RECORDING_MS,
  mediaErrorKind,
  recorderReducer,
  type RecorderEvent,
  type RecorderState,
} from "./recorder-machine";

const run = (events: RecorderEvent[], from: RecorderState = INITIAL_STATE) =>
  events.reduce(recorderReducer, from);

const encoded = { type: "encoded", durationSec: 5, bytes: 160_044 } as const;

describe("recorder state machine (product documentation, Recording State Machine)", () => {
  it("idle → requesting → recording → encoding → ready", () => {
    expect(run([{ type: "record" }])).toEqual({ status: "requesting" });
    expect(run([{ type: "record" }, { type: "granted", at: 1000 }])).toEqual({
      status: "recording",
      startedAt: 1000,
      elapsedMs: 0,
    });
    const ready = run([
      { type: "record" },
      { type: "granted", at: 1000 },
      { type: "stop" },
      encoded,
    ]);
    expect(ready).toEqual({ status: "ready", durationSec: 5, bytes: 160_044, limitReached: false });
  });

  it("requesting → error when permission is denied or there is no microphone", () => {
    expect(run([{ type: "record" }, { type: "denied", error: "permission-denied" }])).toEqual({
      status: "error",
      error: "permission-denied",
    });
    expect(run([{ type: "record" }, { type: "denied", error: "no-device" }])).toMatchObject({
      error: "no-device",
    });
  });

  it("error → idle on dismiss; ready → idle on re-record", () => {
    expect(
      run([
        { type: "record" },
        { type: "denied", error: "permission-denied" },
        { type: "dismiss" },
      ]),
    ).toEqual(INITIAL_STATE);
    expect(
      run([
        { type: "record" },
        { type: "granted", at: 0 },
        { type: "stop" },
        encoded,
        { type: "rerecord" },
      ]),
    ).toEqual(INITIAL_STATE);
  });

  it("ready → uploading → idle", () => {
    const uploading = run([
      { type: "record" },
      { type: "granted", at: 0 },
      { type: "stop" },
      encoded,
      { type: "submit" },
    ]);
    expect(uploading).toEqual({
      status: "uploading",
      durationSec: 5,
      bytes: 160_044,
      limitReached: false,
    });
    expect(recorderReducer(uploading, { type: "uploaded" })).toEqual(INITIAL_STATE);
  });

  it("a failed upload goes back to ready with the same recording (T2.6)", () => {
    const uploading = run([
      { type: "record" },
      { type: "granted", at: 0 },
      { type: "stop" },
      encoded,
      { type: "submit" },
    ]);
    expect(recorderReducer(uploading, { type: "uploadFailed" })).toEqual({
      status: "ready",
      durationSec: 5,
      bytes: 160_044,
      limitReached: false,
    });
  });

  it("stops by itself at 120 seconds", () => {
    const recording = run([{ type: "record" }, { type: "granted", at: 10_000 }]);
    const almost = recorderReducer(recording, { type: "tick", at: 10_000 + MAX_RECORDING_MS - 1 });
    expect(almost).toMatchObject({ status: "recording", elapsedMs: MAX_RECORDING_MS - 1 });
    const stopped = recorderReducer(almost, { type: "tick", at: 10_000 + MAX_RECORDING_MS });
    expect(stopped).toEqual({ status: "encoding", limitReached: true });
    expect(recorderReducer(stopped, encoded)).toMatchObject({
      status: "ready",
      limitReached: true,
    });
    expect(MAX_RECORDING_MS).toBe(120_000);
  });

  it("a failure while recording or encoding is an error", () => {
    const recording = run([{ type: "record" }, { type: "granted", at: 0 }]);
    expect(recorderReducer(recording, { type: "failed" })).toEqual({
      status: "error",
      error: "failed",
    });
    expect(
      recorderReducer({ status: "encoding", limitReached: false }, { type: "failed" }),
    ).toEqual({ status: "error", error: "failed" });
  });

  it("ignores events that do not apply to the current state", () => {
    const ignored: [RecorderEvent, RecorderState][] = [
      [{ type: "stop" }, INITIAL_STATE],
      [{ type: "submit" }, INITIAL_STATE],
      [{ type: "granted", at: 0 }, INITIAL_STATE],
      [{ type: "record" }, { status: "recording", startedAt: 0, elapsedMs: 0 }],
      [
        { type: "rerecord" },
        { status: "uploading", durationSec: 1, bytes: 1, limitReached: false },
      ],
      [{ type: "uploadFailed" }, INITIAL_STATE],
      [encoded, { status: "requesting" }],
    ];
    for (const [event, state] of ignored) expect(recorderReducer(state, event)).toBe(state);
  });
});

describe("mediaErrorKind", () => {
  it.each([
    ["NotAllowedError", "permission-denied"],
    ["SecurityError", "permission-denied"],
    ["NotFoundError", "no-device"],
    ["OverconstrainedError", "no-device"],
    ["NotReadableError", "busy"],
    ["NotSupportedError", "unsupported"],
    ["TimeoutError", "no-audio"],
    ["TypeError", "failed"],
  ])("%s → %s", (name, kind) => {
    expect(mediaErrorKind(Object.assign(new Error("x"), { name }))).toBe(kind);
  });

  it("is unsupported when the browser has no microphone API", () => {
    expect(mediaErrorKind(new Error("x"), { hasMediaDevices: false })).toBe("unsupported");
  });
});

describe("formatClock", () => {
  it.each([
    [0, "0:00"],
    [12_400, "0:12"],
    [65_000, "1:05"],
    [120_000, "2:00"],
  ])("%i ms → %s", (ms, text) => {
    expect(formatClock(ms)).toBe(text);
  });
});
