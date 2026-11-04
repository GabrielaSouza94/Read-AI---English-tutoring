import { describe, expect, it } from "vitest";

import { referenceWords } from "./align";
import type { AzureResult } from "./azure";
import { combineChunkResults, planChunks } from "./azure-chunks";
import type { SpokenWord } from "./deepgram";

/** A read of `sentences` at `secPerWord`, with `pauseSec` between sentences, starting at 1 s. */
function read(sentences: string[], secPerWord = 0.5, pauseSec = 1): SpokenWord[] {
  const words: SpokenWord[] = [];
  let at = 1;
  for (const sentence of sentences) {
    for (const word of referenceWords(sentence)) {
      words.push({
        word: word.toLowerCase().replace(/[^a-z']/g, ""),
        start: at,
        end: at + secPerWord * 0.8,
        confidence: 0.9,
      });
      at += secPerWord;
    }
    at += pauseSec;
  }
  return words;
}

const TEN_WORDS = "one two three four five six seven eight nine ten.";
const SENTENCES = Array.from({ length: 8 }, () => TEN_WORDS); // 8 × (5 s + 1 s pause) ≈ 48 s

describe("planChunks", () => {
  it("keeps a short read in one chunk", () => {
    const sentences = SENTENCES.slice(0, 3);
    const chunks = planChunks(sentences, read(sentences), 20);
    expect(chunks).toHaveLength(1);
    // Silence beyond 0.75 s before the first and after the last word is trimmed.
    expect(chunks[0]).toMatchObject({ startSec: 0.25, wordCount: 30 });
    expect(chunks[0].endSec).toBeCloseTo(18.65);
  });

  it("splits a long read at sentence boundaries, every chunk under the limit", () => {
    const chunks = planChunks(SENTENCES, read(SENTENCES), 50, 25);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.endSec - chunk.startSec).toBeLessThanOrEqual(25);
      expect(chunk.wordCount % 10).toBe(0); // whole sentences only
    }
    expect(chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)).toBe(80);
    // Chunks do not overlap and are cut inside the pauses.
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].startSec).toBeGreaterThanOrEqual(chunks[i - 1].endSec);
    }
  });

  it("splits a single very slow sentence at word boundaries", () => {
    const slow = ["word ".repeat(40).trim() + "."];
    const chunks = planChunks(slow, read(slow, 1.5), 65, 25);
    expect(chunks.length).toBeGreaterThan(2);
    for (const chunk of chunks) expect(chunk.endSec - chunk.startSec).toBeLessThanOrEqual(25);
    expect(chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)).toBe(40);
  });

  it("still covers every reference word when the reader skips a sentence", () => {
    const heard = read([SENTENCES[0], SENTENCES[2]]);
    const chunks = planChunks(SENTENCES.slice(0, 3), heard, 15);
    expect(chunks.reduce((sum, chunk) => sum + chunk.wordCount, 0)).toBe(30);
  });
});

describe("combineChunkResults", () => {
  const result = (accuracy: number, offsetSec = 0): AzureResult => ({
    accuracy,
    fluency: accuracy,
    completeness: 100,
    pronunciation: accuracy,
    prosody: null,
    words: [{ word: "x", accuracy, errorType: "None", offsetSec, durationSec: 0.3 }],
    recognitionStatus: "Success",
  });

  it("weights by reference word count and shifts word offsets", () => {
    const combined = combineChunkResults([
      {
        chunk: { startSec: 0, endSec: 10, referenceText: "", wordCount: 30 },
        result: result(90, 1),
      },
      {
        chunk: { startSec: 10, endSec: 20, referenceText: "", wordCount: 10 },
        result: result(50, 2),
      },
    ]);
    expect(combined.accuracy).toBe(80);
    expect(combined.prosody).toBeNull();
    expect(combined.words.map((word) => word.offsetSec)).toEqual([1, 12]);
  });
});
