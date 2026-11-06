import { describe, expect, it } from "vitest";

import { encodeWav, parseWav, sliceWav, WavError, wavHeader } from "./wav";

describe("encodeWav", () => {
  it("writes a 16 kHz, mono, 16-bit PCM header and the right length", () => {
    const samples = new Float32Array(16_000 * 5); // 5 seconds
    const wav = encodeWav([samples.subarray(0, 1000), samples.subarray(1000)], 16_000);
    expect(wav.length).toBe(44 + 16_000 * 5 * 2);
    const view = new DataView(wav.buffer);
    expect(view.getUint32(4, true)).toBe(36 + 16_000 * 5 * 2); // RIFF size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint32(28, true)).toBe(32_000); // byte rate
    expect(parseWav(wav)).toMatchObject({
      sampleRate: 16_000,
      channels: 1,
      bitsPerSample: 16,
      dataLength: 160_000,
      durationSec: 5,
    });
  });

  it("converts floats to 16-bit samples, clipping outside -1..1", () => {
    const wav = encodeWav([new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2])], 16_000);
    const view = new DataView(wav.buffer, 44);
    const values = [0, 1, 2, 3, 4, 5, 6].map((i) => view.getInt16(i * 2, true));
    // Positive samples scale by 32,767 and negative by 32,768, truncated (the usual PCM conversion).
    expect(values).toEqual([0, 16_383, -16_384, 32_767, -32_768, 32_767, -32_768]);
  });

  it("keeps 2 minutes well under 10 MB", () => {
    const wav = encodeWav([new Float32Array(16_000 * 120)], 16_000);
    expect(wav.length).toBe(3_840_044);
    expect(wav.length).toBeLessThan(10 * 1024 * 1024);
  });
});

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
