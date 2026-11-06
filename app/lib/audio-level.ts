/**
 * Audio maths for the recorder (T2.2), kept apart from the Web Audio code so it can be unit-tested:
 * the level meter, downsampling to 16 kHz, and the 3-second microphone check.
 */

export const TARGET_SAMPLE_RATE = 16_000;

const FLOOR_DB = -60;

/** Loudness of a block of samples on a 0-1 scale (-60 dBFS and below is 0). */
export function level(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  if (rms === 0) return 0;
  const db = 20 * Math.log10(rms);
  return Math.min(1, Math.max(0, (db - FLOOR_DB) / -FLOOR_DB));
}

function dbfs(samples: Float32Array): number {
  let sum = 0;
  for (const s of samples) sum += s * s;
  const rms = Math.sqrt(sum / samples.length);
  return rms === 0 ? -Infinity : 20 * Math.log10(rms);
}

export type Downsampler = { process(input: Float32Array): Float32Array };

/**
 * Converts the AudioContext's rate (usually 44.1 or 48 kHz) to 16 kHz by averaging the input
 * samples that fall in each output sample. Averaging is a simple low-pass filter, which is enough
 * for speech. State carries across chunks, so any chunk size gives the same result.
 */
export function createDownsampler(inputRate: number, outputRate = TARGET_SAMPLE_RATE): Downsampler {
  if (inputRate === outputRate) return { process: (input) => input };
  const ratio = inputRate / outputRate;
  let consumed = 0; // input samples seen so far
  let produced = 0; // output samples written so far
  let sum = 0;
  let count = 0;
  return {
    process(input) {
      const output = new Float32Array(Math.ceil(input.length / ratio) + 1);
      let written = 0;
      for (const sample of input) {
        sum += sample;
        count++;
        consumed++;
        // Integer comparison avoids drift: output k ends after input (k + 1) * ratio.
        if (consumed * outputRate >= (produced + 1) * inputRate) {
          output[written++] = sum / count;
          produced++;
          sum = 0;
          count = 0;
        }
      }
      return output.subarray(0, written);
    },
  };
}

export const MIC_CHECK = {
  durationMs: 3000,
  frameMs: 50,
  frameSamples: (TARGET_SAMPLE_RATE * 50) / 1000,
  /** A frame louder than this counts as sound; a quiet room is around -60 dBFS. */
  thresholdDb: -40,
  /** At least this much sound in 3 seconds: a short word is enough. */
  requiredMs: 300,
} as const;

export type MicCheckResult = "listening" | "passed" | "too-quiet";

export type MicCheck = {
  add(samples16k: Float32Array): void;
  progress(): number;
  result(): MicCheckResult;
};

/** Listens to 3 seconds of 16 kHz audio and decides whether the microphone picks up a voice. */
export function createMicCheck(): MicCheck {
  const frame = new Float32Array(MIC_CHECK.frameSamples);
  let filled = 0;
  let totalMs = 0;
  let loudMs = 0;
  return {
    add(samples) {
      for (const sample of samples) {
        if (totalMs >= MIC_CHECK.durationMs) return;
        frame[filled++] = sample;
        if (filled === frame.length) {
          if (dbfs(frame) > MIC_CHECK.thresholdDb) loudMs += MIC_CHECK.frameMs;
          totalMs += MIC_CHECK.frameMs;
          filled = 0;
        }
      }
    },
    progress: () => Math.min(1, totalMs / MIC_CHECK.durationMs),
    result() {
      if (totalMs < MIC_CHECK.durationMs) return "listening";
      return loudMs >= MIC_CHECK.requiredMs ? "passed" : "too-quiet";
    },
  };
}
