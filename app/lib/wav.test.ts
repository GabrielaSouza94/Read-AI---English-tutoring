import { describe, expect, it } from "vitest";

import { parseWav, sliceWav, WavError, wavHeader } from "./wav";

/** A 16 kHz mono 16-bit WAV of `seconds`, where each sample holds its own index (mod 2^15). */
function makeWav(seconds: number): Uint8Array {
  const samples = Math.round(seconds * 16_000);
  const header = wavHeader({
    sampleRate: 16_000,
    channels: 1,
    bitsPerSample: 16,
    dataLength: samples * 2,
  });
  const out = new Uint8Array(header.length + samples * 2);
  out.set(header);
  const view = new DataView(out.buffer);
  for (let i = 0; i < samples; i++) view.setInt16(44 + i * 2, i % 32_768, true);
  return out;
}

describe("parseWav", () => {
  it("reads format and duration", () => {
    expect(parseWav(makeWav(2.5))).toMatchObject({
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
      dataOffset: 44,
      dataLength: 80_000,
      durationSec: 2.5,
    });
  });

  it("skips extra chunks before the audio", () => {
    const plain = makeWav(1);
    const list = new Uint8Array([...new TextEncoder().encode("LIST"), 4, 0, 0, 0, 1, 2, 3, 4]);
    const withList = new Uint8Array([...plain.subarray(0, 36), ...list, ...plain.subarray(36)]);
    expect(parseWav(withList)).toMatchObject({ dataOffset: 56, durationSec: 1 });
  });

  it("rejects non-WAV data", () => {
    expect(() => parseWav(new TextEncoder().encode("OggS not a wav file"))).toThrow(WavError);
  });
});

describe("sliceWav", () => {
  it("cuts on whole samples and writes a valid header", () => {
    const wav = makeWav(3);
    const slice = sliceWav(wav, 1, 1.5);
    const info = parseWav(slice);
    expect(info.durationSec).toBe(0.5);
    expect(new DataView(slice.buffer).getInt16(44, true)).toBe(16_000); // first sample is #16000
  });

  it("clamps to the recording", () => {
    expect(parseWav(sliceWav(makeWav(2), 1.5, 10)).durationSec).toBe(0.5);
    expect(parseWav(sliceWav(makeWav(2), -1, 0.25)).durationSec).toBe(0.25);
  });
});
