import { describe, expect, it } from "vitest";

import { createDownsampler, createMicCheck, level, MIC_CHECK } from "./audio-level";

const sine = (n: number, rate: number, freq: number, amplitude: number) =>
  Float32Array.from({ length: n }, (_, i) => amplitude * Math.sin((2 * Math.PI * freq * i) / rate));

describe("level", () => {
  it("is 0 for silence and close to 1 for a full-scale signal", () => {
    expect(level(new Float32Array(800))).toBe(0);
    expect(level(sine(800, 16_000, 440, 1))).toBeGreaterThan(0.9);
  });

  it("grows with loudness", () => {
    const quiet = level(sine(800, 16_000, 440, 0.01));
    const loud = level(sine(800, 16_000, 440, 0.3));
    expect(quiet).toBeGreaterThan(0);
    expect(loud).toBeGreaterThan(quiet);
  });
});

describe("createDownsampler", () => {
  it("passes 16 kHz through unchanged", () => {
    const input = sine(160, 16_000, 440, 0.5);
    expect(createDownsampler(16_000).process(input)).toEqual(input);
  });

  it("turns 48 kHz into a third as many samples, across chunk boundaries", () => {
    const down = createDownsampler(48_000);
    const total = [128, 128, 128, 1000].reduce(
      (sum, n) => sum + down.process(new Float32Array(n)).length,
      0,
    );
    expect(total).toBe(Math.floor((128 * 3 + 1000) / 3));
  });

  it("handles 44.1 kHz and keeps the level of a speech-band tone", () => {
    const input = sine(44_100, 44_100, 300, 0.5);
    const output = createDownsampler(44_100).process(input);
    expect(output.length).toBeGreaterThanOrEqual(15_999);
    expect(output.length).toBeLessThanOrEqual(16_000);
    const peak = output.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    expect(peak).toBeGreaterThan(0.45);
    expect(peak).toBeLessThanOrEqual(0.5);
  });
});

describe("createMicCheck", () => {
  const frame = (amplitude: number) => sine(MIC_CHECK.frameSamples, 16_000, 300, amplitude);
  const frames = (ms: number) => Math.round(ms / MIC_CHECK.frameMs);

  it("lasts 3 seconds", () => {
    const check = createMicCheck();
    for (let i = 0; i < frames(2900); i++) check.add(frame(0.2));
    expect(check.result()).toBe("listening");
    for (let i = 0; i < frames(200); i++) check.add(frame(0.2));
    expect(check.result()).toBe("passed");
  });

  it("fails on silence or a very quiet microphone", () => {
    const silent = createMicCheck();
    for (let i = 0; i < frames(3000); i++) silent.add(frame(0));
    expect(silent.result()).toBe("too-quiet");

    const faint = createMicCheck();
    for (let i = 0; i < frames(3000); i++) faint.add(frame(0.001));
    expect(faint.result()).toBe("too-quiet");
  });

  it("passes with speech for part of the time", () => {
    const check = createMicCheck();
    for (let i = 0; i < frames(2500); i++) check.add(frame(0));
    for (let i = 0; i < frames(500); i++) check.add(frame(0.1));
    expect(check.result()).toBe("passed");
    expect(check.progress()).toBe(1);
  });

  it("takes samples in any chunk size", () => {
    const check = createMicCheck();
    const all = sine(16_000 * 3, 16_000, 300, 0.2);
    for (let i = 0; i < all.length; i += 128) check.add(all.subarray(i, i + 128));
    expect(check.result()).toBe("passed");
  });
});
