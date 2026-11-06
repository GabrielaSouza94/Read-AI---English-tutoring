/**
 * Recording states (T2.2), as drawn in product-documentation.md "Recording State Machine":
 * idle → requesting → recording → encoding → ready → uploading → idle, with error → idle on dismiss
 * and ready → idle on re-record. A failed upload that can be retried goes back to ready with the
 * same recording (T2.6), so the participant does not have to read again. Recording stops by itself at 2 minutes. Events that do not apply
 * to the current state are ignored, so a double click or a late timer cannot break the flow.
 */

export const MAX_RECORDING_MS = 120_000;
export const MAX_RECORDING_BYTES = 10 * 1024 * 1024;

export type MediaErrorKind =
  "permission-denied" | "no-device" | "busy" | "no-audio" | "unsupported" | "failed";

export type RecorderState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "recording"; startedAt: number; elapsedMs: number }
  | { status: "encoding"; limitReached: boolean }
  | { status: "ready"; durationSec: number; bytes: number; limitReached: boolean }
  | { status: "uploading"; durationSec: number; bytes: number; limitReached: boolean }
  | { status: "error"; error: MediaErrorKind };

export type RecorderEvent =
  | { type: "record" }
  | { type: "granted"; at: number }
  | { type: "denied"; error: MediaErrorKind }
  | { type: "tick"; at: number }
  | { type: "stop" }
  | { type: "encoded"; durationSec: number; bytes: number }
  | { type: "failed" }
  | { type: "submit" }
  | { type: "uploaded" }
  | { type: "uploadFailed" }
  | { type: "rerecord" }
  | { type: "dismiss" };

export const INITIAL_STATE: RecorderState = { status: "idle" };

export function recorderReducer(state: RecorderState, event: RecorderEvent): RecorderState {
  switch (state.status) {
    case "idle":
      return event.type === "record" ? { status: "requesting" } : state;
    case "requesting":
      if (event.type === "granted")
        return { status: "recording", startedAt: event.at, elapsedMs: 0 };
      if (event.type === "denied") return { status: "error", error: event.error };
      return state;
    case "recording":
      if (event.type === "stop") return { status: "encoding", limitReached: false };
      if (event.type === "failed") return { status: "error", error: "failed" };
      if (event.type === "tick") {
        const elapsedMs = Math.max(0, event.at - state.startedAt);
        return elapsedMs >= MAX_RECORDING_MS
          ? { status: "encoding", limitReached: true }
          : { ...state, elapsedMs };
      }
      return state;
    case "encoding":
      if (event.type === "encoded") {
        return {
          status: "ready",
          durationSec: event.durationSec,
          bytes: event.bytes,
          limitReached: state.limitReached,
        };
      }
      return event.type === "failed" ? { status: "error", error: "failed" } : state;
    case "ready":
      if (event.type === "submit") return { ...state, status: "uploading" };
      return event.type === "rerecord" ? INITIAL_STATE : state;
    case "uploading":
      if (event.type === "uploaded") return INITIAL_STATE;
      return event.type === "uploadFailed" ? { ...state, status: "ready" } : state;
    case "error":
      return event.type === "dismiss" ? INITIAL_STATE : state;
  }
}

/** What went wrong with `getUserMedia`, from the DOMException name. */
export function mediaErrorKind(
  error: unknown,
  { hasMediaDevices = true }: { hasMediaDevices?: boolean } = {},
): MediaErrorKind {
  if (!hasMediaDevices) return "unsupported";
  if (error instanceof Error && error.name === "NotSupportedError") return "unsupported";
  const name = error instanceof Error ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "permission-denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-device";
  if (name === "NotReadableError") return "busy";
  // Raised by our own capture code when the audio engine does not start (no output device).
  if (name === "TimeoutError") return "no-audio";
  return "failed";
}

/** "0:12", "1:05", "2:00". */
export function formatClock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
