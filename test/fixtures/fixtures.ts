/**
 * The audio fixture library (T3.8): what each fixture reads, why it exists, and where its WAV
 * and saved provider responses live. Synthetic fixtures are made by `npm run fixtures` with an
 * Azure neural voice; recorded fixtures (consenting adults, see README.md) replace them later.
 * Integration tests use the saved responses, so they never call Deepgram or Azure.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { SEED_TESTS } from "../../app/db/seed-data";
import type { DeepgramResponse } from "../../app/lib/deepgram";
import type { AzureResponse } from "../../app/lib/azure";

export const FIXTURES_DIR = import.meta.dirname;
export const AUDIO_DIR = join(FIXTURES_DIR, "audio");
export const RESPONSES_DIR = join(FIXTURES_DIR, "responses");

export type FixtureKind =
  | "clean"
  | "slow"
  | "skipped-sentence"
  | "added-words"
  | "mispronounced"
  | "noise"
  | "silence"
  | "long";

export type Fixture = {
  id: string;
  testId: number;
  kind: FixtureKind;
  purpose: string;
  source: "synthetic" | "recorded";
  /** The step this audio is a recording of (1-based, as in `buildSteps`). */
  stepNumber: number;
  /** The step's text, which the scorers compare against. */
  referenceText: string;
  /** What is actually said; null for silence. */
  spokenText: string | null;
  /** How the synthetic voice reads it. */
  tts?: { rate: string; wordBreakMs?: number };
  /** White noise mixed in at this signal-to-noise ratio. */
  noiseSnrDb?: number;
  /** Length of a silent fixture. */
  silenceSec?: number;
};

/** Saved responses for one fixture: Deepgram once, Azure once per chunk (one chunk under 25 s). */
export type FixtureResponses = {
  fixtureId: string;
  savedAt: string;
  deepgramUrl: string;
  deepgram: DeepgramResponse;
  azure: { startSec: number; endSec: number; referenceText: string; response: AzureResponse }[];
};

// "umbrella" → "ambrillo": the voice says a wrong but word-like form.
const VOWEL_SWAP: Record<string, string> = { a: "o", o: "a", e: "i", i: "e", u: "a" };
export function mangle(word: string): string {
  return word.replace(/[aeiou]/gi, (v) => {
    const swapped = VOWEL_SWAP[v.toLowerCase()];
    return v === v.toUpperCase() ? swapped.toUpperCase() : swapped;
  });
}

const join2 = (sentences: string[]) => sentences.join(" ");
const insertAfter = (sentence: string, position: number, extra: string) => {
  const words = sentence.split(" ");
  words.splice(position, 0, extra);
  return words.join(" ");
};
/** The three longest words get a wrong pronunciation. */
function mispronounce(text: string): string {
  const longest = [...new Set(text.split(/\s+/).map((w) => w.replace(/[^\p{L}']/gu, "")))]
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  return text
    .split(" ")
    .map((w) => (longest.includes(w.replace(/[^\p{L}']/gu, "")) ? mangle(w) : w))
    .join(" ");
}

const LONG_RATE: Record<number, string> = { 1: "-45%", 4: "-10%" };

function fixturesFor(testId: number, kinds: FixtureKind[]): Fixture[] {
  const test = SEED_TESTS.find((t) => t.id === testId);
  if (!test) throw new Error(`unknown test ${testId}`);
  const s = test.sentences;
  const step2 = join2(s.slice(0, 2));
  const all: Record<FixtureKind, Omit<Fixture, "id" | "testId" | "kind" | "source">> = {
    clean: {
      purpose: "Happy path: clean read at pass pace",
      stepNumber: 2,
      referenceText: step2,
      spokenText: step2,
      tts: { rate: "0%" },
    },
    slow: {
      purpose: "Fails on WCPM: about 35 to 40 words a minute, a pause after every word",
      stepNumber: 1,
      referenceText: s[0],
      spokenText: s[0],
      tts: { rate: "-50%", wordBreakMs: 350 },
    },
    "skipped-sentence": {
      purpose: "Skipped words and low completeness: sentence 2 left out",
      stepNumber: 3,
      referenceText: join2(s.slice(0, 3)),
      spokenText: join2([s[0], s[2]]),
      tts: { rate: "0%" },
    },
    "added-words": {
      purpose: "Insertions: three extra words",
      stepNumber: 2,
      referenceText: step2,
      spokenText: `Well, ${insertAfter(s[0], 2, "really")} ${insertAfter(s[1], 2, "actually")}`,
      tts: { rate: "0%" },
    },
    mispronounced: {
      purpose: "Highlighting: the three longest words mispronounced",
      stepNumber: 2,
      referenceText: step2,
      spokenText: mispronounce(step2),
      tts: { rate: "0%" },
    },
    noise: {
      purpose: "Unreliable input: clean read under loud background noise",
      stepNumber: 2,
      referenceText: step2,
      spokenText: step2,
      tts: { rate: "0%" },
      noiseSnrDb: -12,
    },
    silence: {
      purpose: "Error handling: four seconds of silence",
      stepNumber: 1,
      referenceText: s[0],
      spokenText: null,
      silenceSec: 4,
    },
    long: {
      purpose: "Azure chunking: the whole story, over 30 seconds",
      stepNumber: s.length + 1,
      referenceText: join2(s),
      spokenText: join2(s),
      tts: { rate: LONG_RATE[testId] ?? "0%" },
    },
  };
  return kinds.map((kind) => ({
    id: `t${testId}-${kind}`,
    testId,
    kind,
    source: "synthetic",
    ...all[kind],
  }));
}

const EVERY_KIND: FixtureKind[] = [
  "clean",
  "slow",
  "skipped-sentence",
  "added-words",
  "mispronounced",
  "noise",
  "silence",
  "long",
];

/** T3.8 acceptance: the 8 fixtures for tests 1 and 4, clean and slow for tests 2 and 3. */
export const FIXTURES: Fixture[] = [
  ...fixturesFor(1, EVERY_KIND),
  ...fixturesFor(2, ["clean", "slow"]),
  ...fixturesFor(3, ["clean", "slow"]),
  ...fixturesFor(4, EVERY_KIND),
];

export const audioPath = (fixture: Fixture) => join(AUDIO_DIR, `${fixture.id}.wav`);
export const responsesPath = (fixture: Fixture) => join(RESPONSES_DIR, `${fixture.id}.json`);

export function getFixture(id: string): Fixture {
  const fixture = FIXTURES.find((f) => f.id === id);
  if (!fixture) throw new Error(`unknown fixture ${id}`);
  return fixture;
}

export function loadFixtureAudio(id: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(readFileSync(audioPath(getFixture(id))));
}

export function loadFixtureResponses(id: string): FixtureResponses {
  return JSON.parse(readFileSync(responsesPath(getFixture(id)), "utf8")) as FixtureResponses;
}

export const hasResponses = (fixture: Fixture) => existsSync(responsesPath(fixture));

/** 16-bit samples with white noise at `snrDb` below the signal. Deterministic (seeded). */
export function addNoise(samples: Int16Array, snrDb: number, seed = 1): Int16Array {
  let sum = 0;
  for (const s of samples) sum += s * s;
  const signalRms = Math.sqrt(sum / Math.max(1, samples.length));
  const noiseRms = signalRms / 10 ** (snrDb / 20);
  // mulberry32
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // Uniform noise in [-a, a] has RMS a / sqrt(3).
  const amplitude = noiseRms * Math.sqrt(3);
  return samples.map((s) =>
    Math.max(-32768, Math.min(32767, Math.round(s + (random() * 2 - 1) * amplitude))),
  );
}
