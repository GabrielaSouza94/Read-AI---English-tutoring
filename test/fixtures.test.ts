/**
 * T3.8: the audio fixture library is complete, every file is 16 kHz mono WAV, and every fixture
 * has saved provider responses made with the current Deepgram URL.
 */
import { existsSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { SEED_TESTS, sentenceId } from "../app/db/seed-data";
import { DEEPGRAM_LISTEN_URL } from "../app/lib/deepgram";
import { buildSteps } from "../app/lib/steps";
import { parseWav } from "../app/lib/wav";
import {
  addNoise,
  audioPath,
  FIXTURES,
  loadFixtureAudio,
  loadFixtureResponses,
  mangle,
  responsesPath,
} from "./fixtures/fixtures";

describe("fixture library (T3.8 acceptance)", () => {
  it("has the 8 fixtures for tests 1 and 4, and clean + slow for tests 2 and 3", () => {
    const kinds = (testId: number) =>
      FIXTURES.filter((f) => f.testId === testId)
        .map((f) => f.kind)
        .sort();
    const every = [
      "added-words",
      "clean",
      "long",
      "mispronounced",
      "noise",
      "silence",
      "skipped-sentence",
      "slow",
    ];
    expect(kinds(1)).toEqual(every);
    expect(kinds(4)).toEqual(every);
    expect(kinds(2)).toEqual(["clean", "slow"]);
    expect(kinds(3)).toEqual(["clean", "slow"]);
    expect(new Set(FIXTURES.map((f) => f.id)).size).toBe(FIXTURES.length);
  });

  it("each reference text is the real text of its step", () => {
    for (const fixture of FIXTURES) {
      const test = SEED_TESTS.find((t) => t.id === fixture.testId);
      if (!test) throw new Error(`unknown test ${fixture.testId}`);
      const text = new Map(test.sentences.map((s, i) => [sentenceId(test.id, i + 1), s]));
      const steps = buildSteps(test.sentences.map((_, i) => sentenceId(test.id, i + 1)));
      const step = steps[fixture.stepNumber - 1];
      expect(step, fixture.id).toBeDefined();
      expect(fixture.referenceText, fixture.id).toBe(
        step.sentenceIds.map((id) => text.get(id)).join(" "),
      );
    }
  });
});

describe.each(FIXTURES.map((f) => [f.id, f] as const))("%s", (id, fixture) => {
  it("is a 16 kHz mono 16-bit WAV of a sensible length", () => {
    expect(existsSync(audioPath(fixture)), `missing ${id}.wav: run npm run fixtures`).toBe(true);
    const info = parseWav(loadFixtureAudio(id));
    expect(info).toMatchObject({ sampleRate: 16_000, channels: 1, bitsPerSample: 16 });
    if (fixture.kind === "silence") expect(info.durationSec).toBe(fixture.silenceSec);
    else if (fixture.kind === "long") expect(info.durationSec).toBeGreaterThan(30);
    else expect(info.durationSec).toBeLessThanOrEqual(30);
    expect(info.durationSec).toBeGreaterThan(1);
  });

  it("has saved Deepgram and Azure responses, made with the current Deepgram URL", () => {
    expect(existsSync(responsesPath(fixture)), `missing ${id}.json: run npm run fixtures`).toBe(
      true,
    );
    const saved = loadFixtureResponses(id);
    expect(saved.fixtureId).toBe(id);
    expect(saved.deepgramUrl, "Deepgram URL changed: re-save with --responses").toBe(
      DEEPGRAM_LISTEN_URL,
    );
    expect(saved.deepgram.results?.channels?.[0]?.alternatives?.[0]).toBeDefined();
    expect(saved.azure.length).toBeGreaterThan(0);
    const duration = parseWav(loadFixtureAudio(id)).durationSec;
    for (const chunk of saved.azure) {
      expect(chunk.endSec - chunk.startSec).toBeLessThanOrEqual(30);
      expect(chunk.endSec).toBeLessThanOrEqual(duration + 0.01);
      expect(chunk.response.RecognitionStatus).toBeTypeOf("string");
    }
    if (fixture.kind === "long") expect(saved.azure.length).toBeGreaterThan(1);
  });
});

describe("fixture helpers", () => {
  it("mangle swaps vowels and keeps capitals", () => {
    expect(mangle("umbrella")).toBe("ambrillo");
    expect(mangle("Africa,")).toBe("Ofreco,");
  });

  it("addNoise is deterministic and close to the asked signal-to-noise ratio", () => {
    const tone = Int16Array.from({ length: 16_000 }, (_, i) =>
      Math.round(8000 * Math.sin((2 * Math.PI * 300 * i) / 16_000)),
    );
    const noisy = addNoise(tone, 10);
    expect(addNoise(tone, 10)).toEqual(noisy);
    const rms = (xs: ArrayLike<number>) =>
      Math.sqrt(Array.from(xs).reduce((s, x) => s + x * x, 0) / xs.length);
    const noise = noisy.map((s, i) => s - tone[i]);
    const snr = 20 * Math.log10(rms(tone) / rms(noise));
    expect(snr).toBeGreaterThan(9.5);
    expect(snr).toBeLessThan(10.5);
  });
});
