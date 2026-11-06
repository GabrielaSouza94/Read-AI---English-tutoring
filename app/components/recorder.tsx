/**
 * Microphone check and recorder (T2.2). The logic lives in `~/lib/recorder-machine` and
 * `~/lib/audio-level`; these components wire it to the Web Audio capture and show the states.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import { captureSupported, startCapture, type Capture } from "~/audio/capture";
import { createMicCheck, level, TARGET_SAMPLE_RATE, type MicCheckResult } from "~/lib/audio-level";
import {
  formatClock,
  INITIAL_STATE,
  MAX_RECORDING_MS,
  mediaErrorKind,
  recorderReducer,
  type MediaErrorKind,
} from "~/lib/recorder-machine";
import { encodeWav } from "~/lib/wav";

const MAX_SAMPLES = (MAX_RECORDING_MS / 1000) * TARGET_SAMPLE_RATE;
const UI_REFRESH_MS = 100;

export const MEDIA_ERROR_TEXT: Record<MediaErrorKind, { title: string; help: string }> = {
  "permission-denied": {
    title: "Read AI cannot use your microphone.",
    help: "To allow it, click the lock or microphone icon next to the address bar, set Microphone to Allow, then reload the page.",
  },
  "no-device": {
    title: "No microphone was found.",
    help: "Connect a microphone or headset, then try again.",
  },
  busy: {
    title: "Your microphone is in use by another app.",
    help: "Close the other app (for example a video call), then try again.",
  },
  unsupported: {
    title: "This browser cannot record audio.",
    help: "Use a recent version of Chrome, Edge, Firefox or Safari.",
  },
  failed: {
    title: "The recording stopped unexpectedly.",
    help: "Please try again. If it keeps happening, reload the page.",
  },
};

const errorKind = (error: unknown) =>
  mediaErrorKind(error, { hasMediaDevices: captureSupported() });

const primaryButton =
  "rounded-button bg-primary px-6 py-3 text-lg font-semibold text-white hover:bg-primary-hover active:bg-primary-dark disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-700";
const secondaryButton =
  "rounded-control border-2 border-primary px-4 py-2 font-semibold text-primary hover:bg-primary-light hover:text-primary-dark";

function LevelMeter({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return (
    <div
      role="meter"
      aria-label="Microphone level"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-3 w-full overflow-hidden rounded-control bg-gray-200"
    >
      <div className="h-full bg-success transition-[width]" style={{ width: `${percent}%` }} />
    </div>
  );
}

function MediaError({ kind, onRetry }: { kind: MediaErrorKind; onRetry: () => void }) {
  const text = MEDIA_ERROR_TEXT[kind];
  return (
    <div role="alert" className="rounded-control bg-danger-light px-4 py-3 text-danger">
      <p className="font-semibold">{text.title}</p>
      <p className="mt-1">{text.help}</p>
      <button type="button" onClick={onRetry} className={`${secondaryButton} mt-3 bg-white`}>
        Try again
      </button>
    </div>
  );
}

/** Feeds 16 kHz samples to `onSamples` while active; reports the level for the meter. */
function useLiveCapture() {
  const capture = useRef<Capture | null>(null);
  const levelRef = useRef(0);

  const start = useCallback(async (onSamples: (samples: Float32Array) => void) => {
    capture.current = await startCapture((samples) => {
      levelRef.current = level(samples);
      onSamples(samples);
    });
  }, []);
  const stop = useCallback(async () => {
    const current = capture.current;
    capture.current = null;
    levelRef.current = 0;
    await current?.stop();
  }, []);

  useEffect(() => {
    return () => {
      void capture.current?.stop();
      capture.current = null;
    };
  }, []);

  return { start, stop, levelRef };
}

type CheckState =
  | { status: "idle" }
  | { status: "requesting" }
  | { status: "listening"; progress: number; level: number }
  | { status: Exclude<MicCheckResult, "listening"> }
  | { status: "error"; error: MediaErrorKind };

/** Speak for 3 seconds; the level must show a voice before the first recording. */
export function MicCheck({ onPassed }: { onPassed: () => void }) {
  const [state, setState] = useState<CheckState>({ status: "idle" });
  const { start, stop, levelRef } = useLiveCapture();
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => clearInterval(timer.current), []);

  async function run() {
    const check = createMicCheck();
    setState({ status: "requesting" });
    try {
      await start((samples) => check.add(samples));
    } catch (error) {
      setState({ status: "error", error: errorKind(error) });
      return;
    }
    timer.current = setInterval(() => {
      const result = check.result();
      if (result === "listening") {
        setState({ status: "listening", progress: check.progress(), level: levelRef.current });
        return;
      }
      clearInterval(timer.current);
      void stop();
      setState({ status: result });
      if (result === "passed") onPassed();
    }, UI_REFRESH_MS);
  }

  return (
    <section aria-labelledby="mic-check-title" className="rounded-card bg-gray-50 p-6">
      <h2 id="mic-check-title" className="text-h3 font-semibold text-gray-900">
        Check your microphone
      </h2>
      <p className="mt-2 text-gray-600">
        Press the button and say a few words, for example your name, for 3 seconds.
      </p>
      <div className="mt-4 space-y-4">
        {state.status === "error" ? (
          <MediaError kind={state.error} onRetry={() => setState({ status: "idle" })} />
        ) : (
          <>
            {state.status === "listening" && <LevelMeter value={state.level} />}
            <p role="status" className="font-medium text-gray-900">
              {state.status === "requesting" && "Allow the microphone when your browser asks."}
              {state.status === "listening" &&
                `Listening… ${Math.ceil(3 - state.progress * 3)} s left`}
              {state.status === "passed" && "Your microphone works."}
              {state.status === "too-quiet" &&
                "We could not hear you. Move closer to the microphone or turn it up, then try again."}
            </p>
            {(state.status === "idle" || state.status === "too-quiet") && (
              <button type="button" onClick={run} className={primaryButton}>
                {state.status === "idle" ? "Check my microphone" : "Check again"}
              </button>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** Record, stop, play back and record again; stops by itself at 2 minutes. */
export function Recorder() {
  const [state, dispatch] = useReducer(recorderReducer, INITIAL_STATE);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [meter, setMeter] = useState(0);
  const { start, stop, levelRef } = useLiveCapture();
  const chunks = useRef<Float32Array[]>([]);
  const samples = useRef(0);

  async function record() {
    dispatch({ type: "record" });
    chunks.current = [];
    samples.current = 0;
    try {
      await start((chunk) => {
        const room = MAX_SAMPLES - samples.current;
        if (room <= 0) return;
        const kept = chunk.length > room ? chunk.subarray(0, room) : chunk;
        chunks.current.push(kept);
        samples.current += kept.length;
      });
      dispatch({ type: "granted", at: performance.now() });
    } catch (error) {
      dispatch({ type: "denied", error: errorKind(error) });
    }
  }

  // While recording: the clock, the meter, and the 2-minute stop.
  useEffect(() => {
    if (state.status !== "recording") return;
    const timer = setInterval(() => {
      dispatch({ type: "tick", at: performance.now() });
      setMeter(levelRef.current);
    }, UI_REFRESH_MS);
    return () => clearInterval(timer);
  }, [state.status, levelRef]);

  // Stop (button or limit) → encode to WAV → ready.
  useEffect(() => {
    if (state.status !== "encoding") return;
    let cancelled = false;
    void (async () => {
      try {
        await stop();
        const wav = encodeWav(chunks.current, TARGET_SAMPLE_RATE);
        if (cancelled) return;
        setAudioUrl(URL.createObjectURL(new Blob([wav], { type: "audio/wav" })));
        dispatch({
          type: "encoded",
          durationSec: samples.current / TARGET_SAMPLE_RATE,
          bytes: wav.length,
        });
      } catch {
        if (!cancelled) dispatch({ type: "failed" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.status, stop]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  function recordAgain() {
    setAudioUrl(null);
    chunks.current = [];
    dispatch({ type: "rerecord" });
  }

  return (
    <section aria-labelledby="recorder-title" className="rounded-card bg-gray-50 p-6">
      <h2 id="recorder-title" className="text-h3 font-semibold text-gray-900">
        Record
      </h2>
      <div className="mt-4 space-y-4">
        {state.status === "error" ? (
          <MediaError kind={state.error} onRetry={() => dispatch({ type: "dismiss" })} />
        ) : (
          <>
            {state.status === "recording" && <LevelMeter value={meter} />}
            <p role="status" className="font-medium text-gray-900">
              {state.status === "idle" && "Press Record when you are ready."}
              {state.status === "requesting" && "Allow the microphone when your browser asks."}
              {state.status === "recording" && `Recording ${formatClock(state.elapsedMs)}`}
              {state.status === "encoding" && "Saving your recording…"}
              {state.status === "ready" &&
                `Recording ready: ${formatClock(state.durationSec * 1000)}. Listen back, or record again.`}
              {state.status === "uploading" && "Sending your recording…"}
            </p>
            {state.status === "ready" && state.limitReached && (
              <p className="text-sm text-gray-600">The recording stopped at the 2-minute limit.</p>
            )}
            {state.status === "idle" && (
              <button type="button" onClick={record} className={primaryButton}>
                Record
              </button>
            )}
            {state.status === "recording" && (
              <button
                type="button"
                onClick={() => dispatch({ type: "stop" })}
                className={`${primaryButton} bg-danger hover:bg-danger active:bg-danger`}
              >
                Stop
              </button>
            )}
            {state.status === "ready" && audioUrl && (
              <div className="space-y-4">
                <audio controls src={audioUrl} className="w-full" aria-label="Your recording" />
                <button type="button" onClick={recordAgain} className={secondaryButton}>
                  Record again
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
